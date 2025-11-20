-- Check shipped_imeis table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_name = 'shipped_imeis'
ORDER BY
    ordinal_position;