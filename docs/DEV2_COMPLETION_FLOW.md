# DEV2 Enrollment Completion Flow

This document records the architecture, behavior, verification, and handoff of the DEV2 completion-event work.

## Objective

Move enrollment completion side effects onto the application-wide EventEmitter2 bus while preserving the API response contract.

+## Acceptance criteria

A first-time lesson completion awards lesson XP; a final lesson also awards course XP, issues one certificate, and sends one course notification.
