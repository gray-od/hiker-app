-- Migration: Rename gear categories to professional standard
-- tent → shelter, kitchen → cooking, first_aid → safety

UPDATE gear_items SET category = 'shelter' WHERE category = 'tent';
UPDATE gear_items SET category = 'cooking' WHERE category = 'kitchen';
UPDATE gear_items SET category = 'safety' WHERE category = 'first_aid';
