UPDATE "Document"
SET category = UPPER(REPLACE(category, ' ', '_'))
WHERE category LIKE '% %';

UPDATE "DocumentMetadata"
SET category = UPPER(REPLACE(category, ' ', '_'))
WHERE category LIKE '% %';

SELECT id, title, category FROM "Document" ORDER BY "createdAt" DESC LIMIT 10;
