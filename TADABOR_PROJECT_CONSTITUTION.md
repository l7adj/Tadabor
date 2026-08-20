# TADABOR — PROJECT CONSTITUTION

Version: 1.0  
Status: **FROZEN / GOVERNING DOCUMENT**  
Repository: `l7adj/Tadabor`

## 1. Purpose

This document is the governing constitution of Tadabor. Any development, refactoring, automation, or agent working on the repository must follow it.

The primary goal is to build Tadabor as a local Android Quran application that works without Internet access and provides a genuine link between Tadabor/search results and the Uthmani Hafs Mushaf.

If a proposed change conflicts with this document, this document prevails unless the project owner explicitly changes it.

## 2. Project identity

- Name: **Tadabor**
- Target: **Android**
- Runtime model: **Offline-only for core operation**
- GitHub repository: `l7adj/Tadabor`

Tadabor is not primarily a hosted website, SaaS product, or cloud application.

## 3. Local-first / offline rule

All data required for core operation must be bundled with the application or stored in app-specific local storage.

This includes, as applicable:

- Quran text and metadata
- Surahs and ayahs
- Search data
- Root/search dictionaries
- Ayah-to-page mappings
- Mushaf pages
- Fonts and visual assets
- JavaScript/CSS and application resources

Core operation must not require Internet access.

## 4. Forbidden runtime dependencies

Do not add runtime dependencies on:

- External APIs
- External backends
- Online databases
- CDNs
- Google Fonts or other remotely loaded fonts
- Remote JavaScript/CSS
- Remote images
- `quran.com` APIs
- `raw.githubusercontent.com`
- Vercel or another hosting service
- Any other external service required for normal operation

Development-time downloads are acceptable only when the resulting runtime resources are committed/bundled locally and the application no longer needs the remote source.

## 5. Mushaf requirement

The target Mushaf is the **Uthmani Hafs / Madinah Mushaf**, 604 pages.

Required Mushaf resources must be local to the application. Pages must not be fetched from the Internet at runtime.

The exact source/version of Mushaf assets must be pinned and documented. Do not silently replace the Mushaf source or version.

## 6. Ayah ↔ Mushaf behavior

The relationship between an ayah and the Mushaf is a core feature, not a cosmetic navigation shortcut.

When the user selects an ayah:

1. Resolve its actual Mushaf page.
2. Open the correct page.
3. Visually identify/highlight the selected ayah.
4. Allow normal page navigation.
5. Allow copying the ayah text.
6. Allow returning to Tadabor.
7. Preserve the selected ayah/context when practical.

Do not replace this with merely opening a generic Mushaf page.

## 7. Quran text integrity

Quranic text is a protected core asset.

Never:

- Generate Quran text with an AI model.
- Manually “correct” Quran text without a verified source.
- Alter Uthmani spelling.
- Add, remove, merge, or split ayahs incorrectly.
- Transform the text in a way that changes its content.

Any Quran-data change must use a trusted source and be verifiable.

## 8. Storage and uninstall

Use Android app-specific storage for runtime-generated application data whenever storage is required.

Do not put essential application data in shared/public storage without a clear technical requirement.

Do not use cache as the source of truth.

Uninstalling Tadabor should remove its private application data so that a fresh installation does not depend on remnants of the previous installation.

## 9. Source of truth

The current GitHub repository is the source of truth:

`l7adj/Tadabor`

Do not silently work from old conversation attachments, obsolete copies, or previously generated code.

Always inspect the current repository state before making substantial changes.

## 10. No rewrite without justification

Do not rewrite Tadabor from scratch.

Prefer:

- Reusing existing code.
- Small, targeted changes.
- Preserving existing functionality.
- Reusing existing data structures.

A major architectural rewrite requires a clear technical reason and explicit owner approval.

## 11. No scope expansion

Do not add unrelated features merely as “improvements”.

Do not introduce accounts, login, cloud sync, backend services, online analytics, subscriptions, advertising, or social features unless the project owner explicitly requests them.

Do not create an open-ended backlog of speculative enhancements.

## 12. Search

Search is a core capability and must remain functional during Android/offline work.

Existing search infrastructure must be inspected and reused before building a replacement.

If a root dictionary, normalizer, orthography layer, or matching infrastructure already exists, do not discard it without a technical reason.

## 13. Development and Android build

The development cycle should support:

`SOURCE → BUILD → APK → INSTALL ON PHONE → TEST`

The final user experience must not require a development server or web hosting.

## 14. Build integrity

After meaningful changes, verify as applicable:

- JavaScript/TypeScript validity
- Web build
- Android build
- bundled assets
- local Quran data
- local Mushaf resources
- offline operation
- navigation
- Quran/search behavior
- ayah-to-page mapping

A code change is not considered complete merely because files were edited.

## 15. No false completion claims

Do not claim that an APK was successfully built unless a successful build result or artifact exists.

Do not claim that the application is offline unless runtime dependencies have been checked.

Do not claim Mushaf fidelity unless the source/version and rendered assets have been verified.

## 16. Minimum acceptance tests

Before declaring the project ready, verify:

1. Launch without Internet.
2. Read Quran without Internet.
3. Search without Internet.
4. Select an ayah.
5. Open its correct Mushaf page.
6. Highlight/identify the ayah.
7. Navigate previous/next pages.
8. Copy the ayah.
9. Return to Tadabor.
10. Close and reopen the app.
11. Uninstall the app.
12. Reinstall it and verify that it starts cleanly without relying on old application data.

## 17. Git discipline

Keep commits logically scoped.

Do not delete files without reason.

Do not rename core files without necessity.

Do not combine unrelated architectural changes in one commit.

Do not change the project constitution without explicit owner approval.

## 18. Protected core assets

Quran data, Mushaf resources, page mappings, and core search infrastructure are protected project assets.

Changes to them require verification of source, version, integrity, and behavior.

## 19. Stop-and-ask conditions

An agent must stop and obtain explicit owner approval before:

- Rewriting the application.
- Replacing the primary framework.
- Changing the Quran source.
- Changing the Mushaf source/version.
- Deleting Quran data.
- Introducing a backend.
- Introducing a cloud dependency.
- Introducing an online API.
- Adding authentication.
- Moving essential data to public/shared storage.
- Removing an existing feature.
- Making a large architectural change.

## 20. Execution rule

For every requested change:

1. Inspect the current repository.
2. Identify affected files.
3. Understand the impact.
4. Make the smallest appropriate change.
5. Build/test.
6. Verify offline behavior where relevant.
7. Verify Android behavior where relevant.
8. Document the change when necessary.
9. Do not add unrelated work.

## 21. Definition of Done

A task is complete only when the implementation is actually verified to the extent applicable:

- Code is in GitHub.
- Build succeeds.
- Android build succeeds when Android is affected.
- APK/AAB is produced or buildability is otherwise proven.
- Core data is local.
- No unwanted runtime external dependency exists.
- Mushaf is local.
- Ayah-to-page navigation works.
- Ayah identification/highlighting works.
- Copy works.
- Navigation works.
- Offline operation works.
- Existing functionality is preserved.
- Scope was not expanded without approval.

## 22. Final project principle

Tadabor is a local Quran contemplation application in which search, ayahs, and the Mushaf are genuinely connected, while Quranic data integrity and independence from the Internet are preserved.

**Stability beats speculative improvement.**

**Local implementation beats an unnecessary online dependency.**

**Fix the existing system before replacing it.**

**Do not alter Quranic text when uncertain; stop and verify.**

---

**TADABOR PROJECT CONSTITUTION v1.0 — FROZEN**

This document may be changed only by explicit decision of the project owner.
