# ROADMAP.md

> **Current Phase**: 3
> **Milestone**: v1.0 (Professionalization & Validation)

## Must-Haves (from SPEC)
- [x] Restore OCR (WinOCR + pypdfium2)
- [x] Support CSV ingestion
- [x] Implement basic `pytest` suite for ingestion
- [ ] Apply Stitch UI tokens and scroll transitions
- [ ] Implement robust Vitest frontend suite
- [ ] Document ParserError responses in OpenAPI

## Phases

### Phase 1: GSD & Context Base
**Status**: ✅ COMPLETED
**Objective**: Build documentation and environment base.
**Deliverables**: SPEC.md, ROADMAP.md, .gsd structure.

### Phase 2: OCR & Ingestion Restoration
**Status**: ✅ COMPLETED
**Objective**: Restore missing backend functionality and add CSV support.
**Deliverables**: `ocr_extractor.py`, `parser_factory.py` updates, `test_ingestion.py`.

### Phase 3: Premium UI Polish
**Status**: ⬜ Not Started
**Objective**: Apply premium Stitch tokens and scroll transitions.
**Deliverables**: Stitch Design System applied, Intersection Observer transitions.

### Phase 4: Final Validation & Ship
**Status**: ⬜ Not Started
**Objective**: End-to-end verification and performance auditing.
**Deliverables**: 100% test pass, walkthrough.md.
