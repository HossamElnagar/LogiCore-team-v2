--- USER Step 97 ---
<USER_REQUEST>
# Revision Request — Maker–Checker CSV Bulk Import & Finance Approval Workflow v2

Revise the existing **"Maker–Checker CSV Bulk Import & Finance Approval Workflow" plan (v2)**.

This is a **plan revision task only**. Do not implement code.

Output the **complete revised plan document**, preserving the same format, section structure, terminology, level of detail, and organization used by v2.

Do not append the fixes as a separate appendix. Integrate every change into the relevant existing sections of the plan.

Do not remove, weaken, or silently alter any existing v2 requirements unless required by the corrections below.

---

# Critical Fix 1 — Explicit DRAFT → Submit → Finance Approval Transition

The current plan incorrectly combines CSV staging and Finance submission.

Currently, `stageCsvImport()` sets:

```text
PENDING_FINANCE_APPROVAL
```

immediately after CSV upload.

This is incorrect because the batch becomes visible to Finance before the Accountant has reviewed the validation preview and explicitly submitted it.

The revised plan MUST introduce an explicit `DRAFT` state.

## Required lifecycle

```text
ACCOUNTANT
    │
    │ Upload CSV
    ▼
┌─────────────┐
│    DRAFT    │
└──────┬──────┘
       │
       │ Accountant reviews preview
       │
       │ Submit for Finance Approval
       ▼
┌──────────────────────────┐
│ PENDING_FINANCE_APPROVAL │
└────────────┬─────────────┘
             │
       FINANCE MANAGER
             │
       ┌─────┴─────┐
       │           │
    APPROVE      REJECT
       │           │
       ▼           ▼
 APPROVED       REJECTED
       │
       ▼
MongoDB Transaction
       │
       ▼
COMMIT
       │
       ▼
Socket.IO
       │
   ┌───┴────┐
   ▼        ▼
Driver      CS
```

---

## `stageCsvImport()`

Revise the method specification so that it:

* Parses the CSV.
* Validates every row.
* Creates the import batch.
* Creates staged shipment records.
* Sets the batch/records to `DRAFT`.
* Associates the batch with the Accountant who created it.
* Does NOT make the batch visible to Finance.
* Does NOT transition to `PENDING_FINANCE_APPROVAL`.
* Does NOT emit the approval socket event.

The upload operation must only create a draft.

---

## `submitBatchForApproval()`

Add:

```text
submitBatchForApproval(batchId, companyId, actorId)
```

This method MUST:

1. Verify that the batch belongs to `companyId`.
2. Verify that the batch is currently `DRAFT`.
3. Verify that the authenticated actor is the Accountant who owns/created the batch.
4. Verify that every staged shipment in the batch has:

   ```text
   validationErrors.length === 0
   ```
5. Reject the operation with HTTP 400 if any validation errors remain.
6. Transition the batch atomically from:

   ```text
   DRAFT
   ```

   to:

   ```text
   PENDING_FINANCE_APPROVAL
   ```
7. Record the submission actor and submission timestamp for auditability.

The operation must be safe against duplicate/concurrent submissions. A batch must not be submitted twice.

### Ownership semantics

Preserve an explicit distinction between:

```text
createdBy
submittedBy
```

where appropriate.

If v2 already defines `submittedBy` as the Accountant who owns the batch, preserve that design and explicitly state that the upload operation initializes the owner identity while the submit operation records/validates the actual submitter.

Do not leave the ownership semantics ambiguous.

---

## API

Add:

```http
POST /api/shipments/submit-import
```

Authorization:

```text
ACCOUNTANT only
```

The endpoint must call:

```text
submitBatchForApproval(batchId, companyId, actorId)
```

The frontend "Submit for Finance Approval" button MUST invoke this real endpoint.

It must not be a UI-only state change.

---

# Finance Visibility Rules

Finance users must NEVER see `DRAFT` batches.

Update:

```text
listPendingBatches()
```

so it queries:

```text
status = PENDING_FINANCE_APPROVAL
```

only.

Finance must never receive:

```text
DRAFT
```

batches through pending-approval queries.

For batch details, make authorization explicit:

* Finance Manager / Owner can retrieve only batches in `PENDING_FINANCE_APPROVAL` or other Finance-authorized states already defined by v2.
* Accountant can retrieve their own `DRAFT` and submitted batches as required by the workflow.
* An Accountant must never be able to retrieve another Accountant's draft.
* Do not design `getBatchDetails()` as a globally unrestricted query.

If v2 already has separate role-specific detail methods, preserve that structure.

---

# Cancellation

Update:

```text
cancelStagedBatch()
```

so that an Accountant can cancel their own batch while it is:

```text
DRAFT
```

or:

```text
PENDING_FINANCE_APPROVAL
```

subject to the existing company/ownership authorization rules.

Cancellation must NOT be allowed once Finance has acted on the batch.

The plan must explicitly define that terminal or Finance-decided states such as:

```text
APPROVED
REJECTED
```

cannot be cancelled through the Accountant cancellation operation.

Preserve the existing cleanup/audit behavior from v2.

---

# Owner Override — Mandatory Re-validation

Revise `overrideBatchDecision()`.

When an Owner attempts to override a:

```text
REJECTED
```

batch to:

```text
APPROVED
```

the method MUST explicitly re-run the same zero-validation-error condition used by `approveImportBatch()`.

Before starting the MongoDB transaction:

1. Load the affected batch/shipment records.
2. Check every staged shipment.
3. Verify:

   ```text
   validationErrors.length === 0
   ```
4. If ANY shipment still contains validation errors:

   * Throw HTTP 400.
   * Do NOT start the approval transaction.
   * Do NOT modify batch state.
   * Do NOT modify shipment state.
   * Do NOT emit a socket event.
   * Do NOT create an approval audit record.

Do not describe this merely as "reuse the normal approval flow."

The plan must explicitly document this validation as a required step inside `overrideBatchDecision()`.

---

## Override Audit Fields

When the Owner override successfully transitions the rejected batch to:

```text
APPROVED
```

the affected shipment records MUST receive:

```text
approvedBy = ownerActorId
approvedAt = current timestamp
```

using the same audit fields populated by the normal Finance Manager approval path.

The override must therefore produce a complete audit trail equivalent to a normal approval, while also recording the existing override-specific audit event/logging required by v2.

Preserve all existing override audit logging from v2.

---

# Replica Set Detection

Revise the database transaction prerequisite/detection section.

Do NOT use:

```text
replSetGetStatus()
```

as the primary replica-set detection mechanism.

The plan must explicitly note that `replSetGetStatus()` may require `clusterMonitor` privileges that the application's MongoDB user may not possess, potentially causing a false negative even when the application is connected to a working replica set.

Use:

```ts
db.admin().command({ hello: 1 })
```

as the primary detection mechanism.

Inspect the returned:

```text
setName
```

field to determine whether the server is operating as part of a replica set.

The plan should distinguish:

```text
replica set detection
```

from:

```text
transaction execution
```

and preserve all existing transaction requirements from v2.

---

# Stale Batch Cleanup

The existing:

```text
cleanupStaleBatches()
```

must have a concrete invocation mechanism.

Do not leave it as a documented-but-unused service method.

Use a `node-cron` scheduled job registered once during application startup.

Schedule:

```text
Every hour
```

The plan must specify:

* Where the cron registration lives.
* How it is initialized exactly once.
* That it invokes `cleanupStaleBatches()`.
* Which statuses/age thresholds are eligible for cleanup, preserving the existing v2 cleanup lifecycle.
* That cleanup remains company/tenant safe.
* That cleanup does not delete Finance-approved audit history.

Do not weaken any cleanup lifecycle already defined in v2.

---

# Migration Precedent

If v2 references:

```text
migrate_roles.ts
```

as a precedent/template for the new migration script, explicitly state that:

1. The existence of `migrate_roles.ts` must first be confirmed in the actual repository.
2. Its structure and conventions must be inspected before using it as a template.
3. If it does not exist, or if its structure differs from the assumptions in v2, the new migration must follow the project's actual existing migration/script conventions instead.

Do not present `migrate_roles.ts` as an already-verified precedent unless repository inspection confirms it.

---

# Frontend — Accountant Workspace

Update `AccountantWorkspace.tsx` so the actual sequence is:

```text
1. Upload CSV
        ↓
2. Create DRAFT batch
        ↓
3. Show validation preview
        ↓
4. Accountant reviews errors
        ↓
5. Fix/re-upload if necessary
        ↓
6. Submit for Finance Approval
        ↓
7. Call POST /api/shipments/submit-import
        ↓
8. Display "Waiting for Finance Approval"
```

The Submit button must:

* Be disabled while validation errors exist.
* Call the real submit endpoint.
* Use the actual batchId.
* Handle server-side validation errors.
* Update Redux state only after the API succeeds.

It must NOT simply change local state from draft to pending.

After successful submission:

* Remove editing controls as appropriate.
* Prevent further Accountant modification of that submitted batch.
* Display the Finance approval status.

---

# Frontend Redux

Update the Redux plan to include a real thunk/action for:

```text
submitImportBatch(batchId)
```

The thunk must:

1. Call:

   ```text
   POST /api/shipments/submit-import
   ```
2. Handle success.
3. Handle HTTP 400 validation failures.
4. Update the batch status from:

   ```text
   DRAFT
   ```

   to:

   ```text
   PENDING_FINANCE_APPROVAL
   ```

   only after successful API response.

Preserve all existing v2 Redux architecture and naming conventions where applicable.

---

# Role Responsibility Matrix

Update the matrix to reflect the explicit submission boundary.

| Action                                     | Accountant |  Finance Manager |            Owner |
| ------------------------------------------ | ---------: | ---------------: | ---------------: |
| Upload CSV                                 |          ✅ | As defined by v2 | As defined by v2 |
| View own DRAFT                             |          ✅ |                ❌ |                ❌ |
| Review own validation preview              |          ✅ |                — |                — |
| Submit for Finance Approval                |          ✅ |                ❌ |                ❌ |
| View pending Finance batches               |          ❌ |                ✅ |                ✅ |
| Approve batch                              |          ❌ |                ✅ |                ✅ |
| Reject batch                               |          ❌ |                ✅ |                ✅ |
| Override rejected batch                    |          ❌ |                ❌ |                ✅ |
| Cancel own DRAFT                           |          ✅ |                ❌ | As defined by v2 |
| Cancel pending batch before Finance action |          ✅ |                ❌ | As defined by v2 |

Do not weaken any existing separation-of-duties constraint from v2.

---

# Status Flow

Replace the old flow with the explicit:

```text
DRAFT
  │
  │ Accountant submits
  ▼
PENDING_FINANCE_APPROVAL
  │
  ├───────────────┐
  │               │
  │ Approve       │ Reject
  ▼               ▼
APPROVED       REJECTED
                  │
                  │ Accountant creates corrected batch
                  ▼
                DRAFT
```

If v2 defines a different rejected-batch lifecycle, preserve its existing semantics while still maintaining the explicit separation between draft creation and Finance submission.

---

# End-to-End Verification

Add/update the E2E test plan to explicitly verify:

### Draft Isolation

1. Accountant uploads valid CSV.
2. Batch is created as `DRAFT`.
3. Finance Manager requests pending batches.
4. Draft batch does NOT appear.

### Explicit Submission

5. Accountant reviews preview.
6. Accountant clicks "Submit for Finance Approval."
7. Frontend calls:

   ```text
   POST /api/shipments/submit-import
   ```
8. Batch transitions:

   ```text
   DRAFT → PENDING_FINANCE_APPROVAL
   ```

### Invalid Submission

9. Accountant attempts to submit a batch containing validation errors.
10. Expect HTTP 400.
11. Batch remains `DRAFT`.
12. Finance still cannot see it.

### Ownership

13. Accountant A attempts to submit Accountant B's DRAFT.
14. Expect authorization failure.
15. Batch remains unchanged.

### Finance Isolation

16. Finance Manager can see `PENDING_FINANCE_APPROVAL`.
17. Finance Manager cannot see Accountant DRAFT batches.
18. Finance Manager cannot modify the uploaded CSV.

### Normal Approval

19. Finance Manager approves a valid batch.
20. MongoDB transaction executes.
21. Shipment records receive:

```text
APPROVED
approvedBy
approvedAt
```

22. Timeline records are created.
23. Transaction commits.
24. Only after commit:

```text
shipments:bulk_approved
```

is emitted.

### Rejection

25. Finance Manager rejects a batch.
26. Rejection reason is persisted.
27. Batch becomes `REJECTED`.
28. Accountant can see the rejection and create a corrected submission.
29. Preserve the audit history.

### Owner Override — Invalid Rows

30. Owner attempts to override a `REJECTED` batch containing invalid rows to `APPROVED`.
31. Expect HTTP 400.
32. Expect NO state change.
33. Expect NO shipment approval.
34. Expect NO `approvedBy` / `approvedAt` mutation.
35. Expect NO socket event.
36. Expect NO successful approval audit record.

### Owner Override — Valid Rows

37. Owner overrides a `REJECTED` batch containing zero validation errors.
38. Batch becomes `APPROVED`.
39. Every affected shipment receives:

```text
approvedBy = ownerId
approvedAt = timestamp
```

40. Existing override audit logging is created.
41. Socket event is emitted only after transaction commit.

### Cancellation

42. Accountant can cancel their own `DRAFT`.
43. Accountant can cancel their own `PENDING_FINANCE_APPROVAL` batch before Finance acts, according to v2 rules.
44. Accountant cannot cancel an already `APPROVED` or `REJECTED` batch.

### Cleanup

45. Confirm the hourly `node-cron` job invokes `cleanupStaleBatches()`.
46. Confirm eligible stale batches are cleaned according to the existing v2 lifecycle.
47. Confirm approved/audited records are not incorrectly removed.

### Database Prerequisite

48. Confirm replica-set detection uses:

```ts
db.admin().command({ hello: 1 })
```

49. Confirm the application does not depend on `replSetGetStatus()` requiring unavailable `clusterMonitor` privileges.

---

# Migration Planning

If the revised plan requires a database migration:

* First inspect the repository for existing migration/script conventions.
* Confirm whether `migrate_roles.ts` actually exists.
* If it exists, inspect its real structure before using it as a precedent.
* If it does not exist or differs from the expected pattern, follow the repository's actual conventions.
* Include rollback considerations where supported by the existing migration system.

---

# Final Consistency Requirement

After applying all changes, review the entire v2 plan for contradictions.

The final plan must consistently reflect:

```text
CSV Upload
    ↓
DRAFT
    ↓
Accountant Review
    ↓
POST /api/shipments/submit-import
    ↓
PENDING_FINANCE_APPROVAL
    ↓
Finance Manager Review
    ├── Approve
    │     ↓
    │  Transaction
    │     ↓
    │  APPROVED
    │     ↓
    │  COMMIT
    │     ↓
    │  Socket.IO
    │
    └── Reject
          ↓
       REJECTED
          ↓
       Corrected submission
          ↓
         DRAFT
```

Preserve all existing v2 requirements for:

* Maker–Checker separation of duties
* RBAC
* Multi-tenant `companyId` isolation
* MongoDB transaction-based approval
* Timeline/audit logging
* Owner override auditing
* Stale-batch cleanup lifecycle
* Socket.IO post-commit behavior
* Strict TypeScript architecture
* Existing backend/frontend architectural conventions

Output ONLY the complete revised implementation plan document after integrating the fixes.

</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-08-08T14:34:38+03:00.
</ADDITIONAL_METADATA>

