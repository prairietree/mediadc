# Nextcloud 33 to 34 Migration Notes

When porting `mediadc` from Nextcloud 33 to Nextcloud 34, review framework deprecations, internal database-query changes, and frontend API shifts.

## Known Breaking Changes

### 1. Legacy jQuery Dependencies Removed

Nextcloud has been removing older JavaScript libraries. In Nextcloud 34, core interfaces have finalized the removal of jQuery dependencies in favor of native ES modules and `@nc/vue` components.

**Impact:** Frontend scripts or third-party tracking assets in `src/` that rely on global calls such as `$` or `jQuery` may crash with an undefined-reference error.

**Action:** Audit custom frontend assets and refactor them to modern JavaScript or TypeScript syntax, or standard Vue 3 lifecycle bindings.

**Mitigation** Ran numerous searches and found zero real matches. 

### 2. Deprecated `QueryBuilder::execute()` Removed

For backend file-database indexing, which is central to a duplicate seeker such as `mediadc`, Nextcloud's PHP database engine received a strict update.

**Impact:** The old `QueryBuilder->execute()` method, used across apps to query file tables, has been dropped or may raise immediate deprecation errors.

**Action:** Review PHP controllers in `lib/`. Replace `execute()` with the appropriate explicit method:

- `executeQuery()` for `SELECT` queries
- `executeStatement()` for `INSERT` and `UPDATE` queries

**Mitigation** Searched all PHP files (excluding vendor/node_modules) for `->execute(` and found no `QueryBuilder` usages; existing mapper queries already use `executeStatement()`/`QBMapper` helpers, and the only `execute()` matches are unrelated Symfony `Command::execute()` overrides.

### 3. DAV Permissions and File-System Hooks Changed

`mediadc` manipulates, compares, and interacts with file and folder attributes in a user's cloud filesystem.

**Impact:** Nextcloud 34 adjusted the structure of internal WebDAV engine signatures, including the behavior and parameter syntax of `getDavPermissions`.

**Action:** Review backend hooks into virtual-filesystem properties to ensure permission evaluations do not produce signature or parameter mismatch errors.

**Mitigation:** No app code currently implements a custom DAV permission hook or direct override of `getDavPermissions` in `apps-extra/mediadc`. The app's PHP logic was reviewed for filesystem metadata access and no direct `QueryBuilder` or DAV hook override patterns were found; the remaining validation is to exercise permission-sensitive flows in a real NC 34 instance (share access, external mounts, and permission-denied cases) and confirm no runtime mismatch occurs when file attributes are read or compared.

### 4. Core Frontend Utility Dependencies Updated

Nextcloud 34 updated the native dependency targets for core system tools:

- `@vueuse/core` 14.3.0
- `@vueuse/integrations` 14.3.0

**Action:** When running `npm run build` on the `stable34` branch, run `npm update` as needed to align local `package.json` specifications with the upgraded dependencies and Hub design tokens.

## Recommended Testing

1. Enable debug logging in `config/config.php`:

   ```php
   'loglevel' => 0,
   ```

2. Inspect browser-console output for failed file-management actions and CSS layout issues related to the updated design system.

3. Run the app's focused static checks and unit tests:

   ```bash
   composer lint
   composer psalm
   composer test:unit
   ```

4. Install frontend dependencies from the lockfile and build the production bundle:

   ```bash
   npm ci
   npm run lint
   npm run build
   ```

5. Test the upgrade path with a copy of a Nextcloud 33 installation and existing MediaDC data. Confirm that the post-migration repair step completes, existing scan results remain readable, and uninstall cleanup is not triggered during an update.

6. Exercise the collector cleanup background job and its corresponding `occ` commands after the upgrade. Confirm that scheduled jobs complete without errors and do not remove active tasks or results.

7. Scan local files, shared folders, and external storage. Test duplicate detection, task cancellation, result handling, and permission-denied cases with both regular users and administrators.

8. Validate the server prerequisites declared by the app: PHP 8.2 or newer, Python 3.9 or newer, `ffmpeg`, and a 64-bit PHP integer size. Check both the web-server and background-job execution environments.

## Optional Automation

Add a GitHub Actions workflow to run static analysis such as Psalm or PHPStan, helping identify incompatible Nextcloud 34 backend API usage.

## What We Did

- Reviewed the repository layout and confirmed that `mediadc` is a separate nested Git repository under the parent Nextcloud workspace, not a tracked submodule of the main project.
- Confirmed the active repository is `apps-extra/mediadc` and that its current branch is `update-to-support-nextcloud-34-and-35`.
- Reviewed the app metadata in `appinfo/info.xml` and documented the relevant Nextcloud 34 compatibility constraints.
- Identified the main upgrade-sensitive areas for this app: frontend dependency changes, PHP database query calls, DAV permission/file-hook integration, migration repair steps, and background job execution.
- Added a structured checklist and testing notes in this document so the update can be validated in a focused, traceable way.
- Got ESLint working and ran fix with it.
- Manually fixed rest of issues found by ESLint.
- Wrapped LoadViewer in check incase viwer app is not installed.
- Did some very basic testing to make sure you still works.


## Questions to Confirm Before We Change Code

1. Proceed with actual code changes in the nested `mediadc` repository: yes.
2. Work on the `stable34` branch: yes.
3. Break the port into manageable chunks: yes.
4. Keep the work focused on the app update and avoid unrelated cleanup unless it is required by the Nextcloud 34 port: yes.

## Implementation Plan

- Work directly in the `stable34` branch of `apps-extra/mediadc`.
- Break the update into focused phases to keep validation manageable and traceable.
- After each phase, run the relevant linting, static analysis, and app-level verification before moving to the next chunk.
- Treat migration checks, frontend compatibility, and backend API updates as separate work streams when practical.

## Special Review and Testing Notes

- No assumptions were made about the app's exact runtime behavior. The following areas need explicit validation before we call the update complete:
  - database query replacements in PHP controllers and any `QueryBuilder` usage
  - DAV permission checks and any virtual filesystem hook changes
  - frontend build and lint behavior after dependency refresh
  - migration and repair-step execution on a real or copied Nextcloud 34 instance
  - background cleanup jobs and scheduled task reliability
  - scanning behavior for local, shared, and external storage paths
  - permissions and error handling for both normal users and administrators

- The app declares `nextcloud min-version="34" max-version="34"` in `appinfo/info.xml`, so compatibility should be validated against the exact 34 release line and not broadly assumed to work across all future Nextcloud versions.
- If a working Nextcloud 34 test environment is available, we should validate the migration path with actual data before finalizing code changes.