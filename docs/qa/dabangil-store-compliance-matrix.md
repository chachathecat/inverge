# 답안길 Store, Privacy, and Release Compliance Matrix

- Authority: ULC-0 / Issue #719
- Evidence-producing future stage: ULC-R1
- Release stage: ULC-L1
- Current store/deployment/public authorization: none

This matrix is a future release contract, not a claim that a store policy,
binary, listing, review account, or deployment is ready.

| Requirement | Web | iOS/iPadOS | Android | Required evidence before ULC-L1 | Current state |
|---|---|---|---|---|---|
| In-app account deletion | authenticated Web account entry | required in-app entry | required in-app entry | route recording, scope confirmation, server receipt, failure/retry proof | future-gated |
| External deletion resource | public durable Web resource | listing/link points to resource | listing/link points to resource | reachable URL, policy/version binding, end-to-end verification | future-gated |
| Answer deletion | required | required | required | same scoped server deletion receipt across surfaces | future-gated |
| Data export | required | in-app entry or linked authenticated Web flow | in-app entry or linked authenticated Web flow | complete scope manifest, delivery, expiry, retry, and deletion proof | future-gated |
| Privacy policy | public versioned policy | listing and in-app access | listing and in-app access | exact version and store metadata digest | future-gated |
| Apple App Privacy | n/a | required | n/a | declaration matches actual SDK/data inventory | future-gated |
| Google Data Safety | n/a | n/a | required | declaration matches actual SDK/data inventory | future-gated |
| AI-assisted disclosure | required | required | required | same result-level vocabulary and policy version | future-gated |
| Source/currentness date | required | required | required | same exact source/version/date projection | future-gated |
| Human-review state | required | required | required | same approved state vocabulary | future-gated |
| Notification privacy | browser notifications if enabled | APNs path | FCM path | payload audit proves no answer/OCR/concept/score/private text | future-gated |
| Camera permission | browser prompt only when invoked | least privilege, purpose string | least privilege, purpose declaration | denial/retry/revoke tests and no background capture | future-gated |
| Photo permission | file picker/capture only | least privilege | least privilege | selected-item-only behavior where available and denial path | future-gated |
| File permission | browser picker | least privilege | least privilege | no broad storage permission when a picker suffices | future-gated |
| App-review demo account | n/a unless gated Web review requires it | required | required | non-Production review data, documented navigation, expiration/rotation | future-gated |
| Delete/export verification | required | required | required | cross-surface E2E receipts and negative tenant-isolation cases | future-gated |
| Store metadata | Web public copy digest | App Store listing digest | Play listing digest | copy, screenshots, support states, privacy and AI claims match binary | future-gated |
| Native build evidence | n/a | bundle/version/build/EAS build | package/version/version-code/EAS build | signed build identity and exact source head/tree | future-gated |
| Release hold | Web final gate | approved and held for manual release | approved and held through managed publishing or exact equivalent | hold-state receipt before command | future-gated |

## Required privacy assertions

1. Permission requests occur only at the learner action that needs them.
2. Denial leaves a usable alternative path and never creates a false
   completion state.
3. Notification payloads contain no raw answer, OCR, concept, score, source
   private text, or other learner-private body.
4. A client never receives a service-role or provider secret.
5. Store declarations are generated from or checked against the exact final
   SDK, permission, data-flow, and retention inventory.
6. Account deletion and answer deletion are distinct scopes with explicit
   confirmation and server receipts.
7. Export/delete evidence covers success, authorization denial, cross-tenant
   denial, partial failure, retry, and final state.
8. AI/source/currentness/human-review status is visible before reliance, not
   hidden only in policy prose.

## `DabangilReleaseManifestV1`

The final manifest binds exactly one coordinated release:

| Field | Required content |
|---|---|
| `releaseId` | immutable coordinated release identity |
| `publicVersion` | one public product version |
| `gitHead` / `gitTree` | exact reviewed source identity |
| `webDeployment` | immutable Web deployment identity and gate status |
| `iosBundleIdVersionBuildEasBuild` | bundle ID, version, build, EAS build |
| `androidPackageVersionVersionCodeEasBuild` | package, version, version code, EAS build |
| `apiEvidenceValidatorVersions` | exact trusted API/evidence/validator versions |
| `migrationSetDigest` | exact ordered migration set |
| `privacyPolicyVersion` | policy version exposed by every surface |
| `aiDisclosureVersion` | disclosure vocabulary/policy version |
| `accountDeletionVerification` | in-app iOS/Android and external-Web proof |
| `storeMetadataDigest` | exact approved listing metadata |
| `perSurfaceFinalGateStatus` | Web, iOS/iPadOS, and Android final gate status |

## Coordinated availability

- iOS is approved and held for manual release.
- Android is approved and held through managed publishing or the exact
  available equivalent.
- Web remains behind the final public gate.
- One manual release command starts the availability clock.
- Web, iOS/iPadOS, and Android must become available within at most 24 hours.
- A surface that cannot meet its gate blocks the coordinated release; it is
  not silently omitted from public 1.0.
