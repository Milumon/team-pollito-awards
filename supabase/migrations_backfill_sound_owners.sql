-- Backfill owner_user_id for approved sounds that were submitted by users
-- Matches soundboard_sounds to sound_submissions by file_path or name
UPDATE soundboard_sounds s
SET owner_user_id = sub.submitted_by_user_id
FROM sound_submissions sub
WHERE s.owner_user_id IS NULL
  AND sub.status = 'approved'
  AND (
    s.file_path = sub.file_path
    OR s.name = sub.name
  );
