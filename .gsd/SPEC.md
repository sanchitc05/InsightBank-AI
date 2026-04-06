# SPEC.md — Project Specification: InsightBank AI Restoration

> **Status**: `FINALIZED`

## Vision
A premium, AI-powered financial dashboard that transforms complex bank statements (PDF/CSV/Scanned) into actionable insights with a sleek, modern UI.

## Goals
1. **Restore Full Ingestion**: Implement OCR (WinOCR/pypdfium2) and CSV support to handle all bank statement formats (HDFC, ICICI, SBI).
2. **Dynamic UI/UX**: Apply a premium Stitch design system with scroll-triggered "live" animations.
3. **Empirical Validation**: Establish a robust `pytest` suite to verify extraction accuracy (zero regression).
4. **Local First**: Maintain privacy by processing as much as possible on-device (OCR fallback).

## Non-Goals (Out of Scope)
- Mobile App development (Desktop Web focus for now).
- External database hosting (SQLite/Local storage focus).
- Support for non-Indian bank statements (v1 focus).

## Users
Personal finance managers and individuals who want a secure, consolidated view of their spending across multiple bank accounts.

## Constraints
- **Windows OS**: Must utilize `WinOCR` where available for speed.
- **Privacy**: OCR must run locally.
- **Tech Stack**: FastAPI (Backend), React/Vite (Frontend), SQLite/Chromadb (Context).

## Success Criteria
- [ ] 100% extraction accuracy for digital PDFs (HDFC/ICICI/SBI).
- [ ] >95% accuracy for scanned/OCR statements.
- [ ] UI achieves "Premium" look with Stitch tokens and scroll transitions.
- [ ] Total system test coverage > 80% for ingestion logic.
