from datetime import date

from app.models.user import User
from app.models.insight import Insight
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


def add_insights(db_session, statement_id, rows):
    for row in rows:
        insight = Insight(
            statement_id=statement_id,
            type=row["type"],
            title=row["title"],
            body=row.get("body"),
            severity=row.get("severity", "info"),
        )
        db_session.add(insight)
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


def test_aggregate_analytics_endpoints_support_all_time_and_month_filters(client, db_session):
    email = "insights_aggregate@example.com"
    register_and_login(client, email)
    user_id = get_user_id(db_session, email)

    march_stmt = create_statement(db_session, user_id, month=3, year=2026, account_number="ACCT-101")
    april_stmt = create_statement(db_session, user_id, month=4, year=2026, account_number="ACCT-102")

    add_transactions(
        db_session,
        march_stmt.id,
        [
            {
                "txn_date": date(2026, 3, 2),
                "description": "Salary credit",
                "credit": 5000.0,
                "balance": 5000.0,
                "category": "Salary",
                "merchant": "Employer",
            },
            {
                "txn_date": date(2026, 3, 4),
                "description": "Rent payment",
                "debit": 1200.0,
                "balance": 3800.0,
                "category": "Rent",
                "merchant": "Landlord",
            },
            {
                "txn_date": date(2026, 3, 10),
                "description": "Groceries",
                "debit": 300.0,
                "balance": 3500.0,
                "category": "Food",
                "merchant": "Market",
            },
        ],
    )
    add_transactions(
        db_session,
        april_stmt.id,
        [
            {
                "txn_date": date(2026, 4, 1),
                "description": "Salary credit",
                "credit": 4000.0,
                "balance": 7500.0,
                "category": "Salary",
                "merchant": "Employer",
            },
            {
                "txn_date": date(2026, 4, 6),
                "description": "Fuel",
                "debit": 500.0,
                "balance": 7000.0,
                "category": "Transport",
                "merchant": "Fuel Station",
            },
        ],
    )
    add_insights(
        db_session,
        march_stmt.id,
        [{"type": "tip", "title": "March alert", "severity": "alert"}],
    )
    add_insights(
        db_session,
        april_stmt.id,
        [{"type": "pattern", "title": "April note", "severity": "info"}],
    )

    summary_all = client.get("/api/v1/analytics/summary")
    assert summary_all.status_code == 200
    summary_payload = summary_all.json()
    assert summary_payload["period"] == "all-time"
    assert summary_payload["total_income"] == 9000.0
    assert summary_payload["total_expense"] == 2000.0
    assert summary_payload["savings"] == 7000.0
    assert summary_payload["transaction_count"] == 5
    assert summary_payload["top_category"] == "Rent"
    assert summary_payload["daily_avg_spend"] == 32.79

    summary_march = client.get("/api/v1/analytics/summary", params={"month": "2026-03"})
    assert summary_march.status_code == 200
    march_summary_payload = summary_march.json()
    assert march_summary_payload["period"] == "2026-03"
    assert march_summary_payload["total_income"] == 5000.0
    assert march_summary_payload["total_expense"] == 1500.0
    assert march_summary_payload["savings"] == 3500.0

    categories_all = client.get("/api/v1/analytics/categories")
    assert categories_all.status_code == 200
    categories_payload = categories_all.json()
    assert categories_payload["period"] == "all-time"
    assert categories_payload["data"][0]["category"] == "Rent"
    assert categories_payload["data"][0]["total"] == 1200.0

    trend_all = client.get("/api/v1/analytics/trend")
    assert trend_all.status_code == 200
    trend_payload = trend_all.json()
    assert trend_payload["period"] == "all-time"
    assert len(trend_payload["data"]) == 2
    assert trend_payload["data"][0]["period"] == "2026-03"
    assert trend_payload["data"][1]["period"] == "2026-04"

    transactions_march = client.get("/api/v1/transactions", params={"month": "2026-03", "page_size": 200})
    assert transactions_march.status_code == 200
    transactions_payload = transactions_march.json()
    assert transactions_payload["period"] == "2026-03"
    assert transactions_payload["total"] == 3
    assert transactions_payload["summary"]["total_debit"] == 1500.0
    assert transactions_payload["summary"]["total_credit"] == 5000.0

    insights_march = client.get("/api/v1/insights", params={"month": "2026-03"})
    assert insights_march.status_code == 200
    insights_payload = insights_march.json()
    assert insights_payload["period"] == "2026-03"
    assert len(insights_payload["insights"]) == 1
    assert insights_payload["insights"][0]["title"] == "March alert"


def test_aggregate_endpoints_reject_invalid_month_filter(client, db_session):
    email = "insights_invalid_month@example.com"
    register_and_login(client, email)

    response = client.get("/api/v1/analytics/summary", params={"month": "2026-13"})
    assert response.status_code == 422
    assert "Invalid month format" in response.json()["detail"]
