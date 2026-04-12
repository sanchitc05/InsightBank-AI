from datetime import date

from app.models.user import User
from app.models.statement import Statement
from app.models.transaction import Transaction


def register_and_login(client, email):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123!@#"},
    )
    assert response.status_code == 200
    login = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password123!@#"},
    )
    assert login.status_code == 200


def get_user_id(db_session, email):
    user = db_session.query(User).filter(User.email == email).first()
    assert user is not None
    return user.id


def create_statement(db_session, user_id, month, year, account_number):
    stmt = Statement(
        bank_name="GENERIC",
        account_number=account_number,
        month=month,
        year=year,
        file_name=f"statement_{month}_{year}.pdf",
        user_id=user_id,
        total_credit=0.0,
        total_debit=0.0,
        status="SUCCESS",
    )
    db_session.add(stmt)
    db_session.commit()
    db_session.refresh(stmt)
    return stmt


def add_transactions(db_session, statement_id, rows):
    for row in rows:
        txn = Transaction(
            statement_id=statement_id,
            txn_date=row.get("txn_date"),
            description=row.get("description"),
            debit=row.get("debit", 0.0),
            credit=row.get("credit", 0.0),
            balance=row.get("balance", 0.0),
            category=row.get("category", "Uncategorized"),
            merchant=row.get("merchant"),
        )
        db_session.add(txn)
    db_session.commit()


def test_generate_and_get_insights(client, db_session):
    email = "insights_happy@example.com"
    register_and_login(client, email)
    user_id = get_user_id(db_session, email)

    stmt = create_statement(db_session, user_id, month=3, year=2026, account_number="ACCT-001")
    add_transactions(
        db_session,
        stmt.id,
        [
            {
                "txn_date": date(2026, 3, 3),
                "description": "Salary credit",
                "credit": 5000.0,
                "balance": 5000.0,
                "category": "Salary",
                "merchant": "Employer",
            },
            {
                "txn_date": date(2026, 3, 5),
                "description": "Coffee Shop purchase",
                "debit": 250.0,
                "balance": 4750.0,
                "category": "Food",
                "merchant": "Coffee Shop",
            },
            {
                "txn_date": date(2026, 3, 8),
                "description": "Streaming subscription",
                "debit": 399.0,
                "balance": 4351.0,
                "category": "Entertainment",
                "merchant": "Streamly",
            },
        ],
    )

    generate = client.post(f"/api/v1/insights/generate/{stmt.id}")
    assert generate.status_code == 200
    payload = generate.json()
    assert payload["statement_id"] == stmt.id
    assert payload["generated"] >= 1
    assert isinstance(payload["insights"], list)

    fetched = client.get(f"/api/v1/insights/{stmt.id}")
    assert fetched.status_code == 200
    insights = fetched.json()
    assert isinstance(insights, list)
    assert len(insights) >= payload["generated"]

    sample = insights[0]
    for key in ["id", "statement_id", "type", "title", "severity"]:
        assert key in sample
    assert sample["statement_id"] == stmt.id


def test_generate_insights_no_transactions_returns_422(client, db_session):
    email = "insights_empty@example.com"
    register_and_login(client, email)
    user_id = get_user_id(db_session, email)

    stmt = create_statement(db_session, user_id, month=4, year=2026, account_number="ACCT-002")

    response = client.post(f"/api/v1/insights/generate/{stmt.id}")
    assert response.status_code == 422
    assert "No transactions found" in response.json()["detail"]


def test_compare_response_shape(client, db_session):
    email = "insights_compare@example.com"
    register_and_login(client, email)
    user_id = get_user_id(db_session, email)

    stmt_a = create_statement(db_session, user_id, month=1, year=2026, account_number="ACCT-003")
    stmt_b = create_statement(db_session, user_id, month=2, year=2026, account_number="ACCT-004")

    add_transactions(
        db_session,
        stmt_a.id,
        [
            {
                "txn_date": date(2026, 1, 10),
                "description": "Groceries",
                "debit": 1200.0,
                "balance": 3800.0,
                "category": "Food",
                "merchant": "Market",
            },
            {
                "txn_date": date(2026, 1, 15),
                "description": "Salary credit",
                "credit": 5000.0,
                "balance": 8800.0,
                "category": "Salary",
                "merchant": "Employer",
            },
        ],
    )

    add_transactions(
        db_session,
        stmt_b.id,
        [
            {
                "txn_date": date(2026, 2, 12),
                "description": "Fuel",
                "debit": 900.0,
                "balance": 2900.0,
                "category": "Transport",
                "merchant": "Fuel Station",
            },
            {
                "txn_date": date(2026, 2, 20),
                "description": "Salary credit",
                "credit": 5000.0,
                "balance": 7900.0,
                "category": "Salary",
                "merchant": "Employer",
            },
        ],
    )

    response = client.get(f"/api/v1/analytics/compare?ids={stmt_a.id},{stmt_b.id}")
    assert response.status_code == 200
    data = response.json()

    assert "statements" in data
    assert "summary" in data
    assert "categories" in data
    assert len(data["statements"]) == 2
    assert len(data["summary"]) == 2
    assert len(data["categories"]) == 2

    category_list = data["categories"][0]
    assert isinstance(category_list, list)
    assert len(category_list) >= 1
    category_entry = category_list[0]
    for key in ["category", "total", "count", "percentage"]:
        assert key in category_entry
