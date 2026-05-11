"""
Migration script: Move documents from the shared 'BaseDocument' collection
into their proper per-model collections after removing is_root=True.
"""
import pymongo

client = pymongo.MongoClient('mongodb://localhost:27017')
db = client['school_management']

# Map _class_id suffix -> target collection name
CLASS_MAP = {
    'AdminUser': 'admin_users',
    'Student': 'students',
    'Staff': 'staff',
    'ClassModel': 'classes',
    'Subject': 'subjects',
    'Attendance': 'attendance',
    'Fee': 'fees',
    'AuditLog': 'audit_logs',
    'Exam': 'exams',
    'Grade': 'grades',
}

docs = list(db['BaseDocument'].find())
print(f"Found {len(docs)} documents in BaseDocument collection")

migrated = 0
for doc in docs:
    class_id = doc.get('_class_id', '')
    # Extract the model name (e.g. "BaseDocument.AdminUser" -> "AdminUser")
    model_name = class_id.split('.')[-1] if '.' in class_id else class_id

    target_collection = CLASS_MAP.get(model_name)
    if not target_collection:
        print(f"  SKIPPED: Unknown _class_id '{class_id}' for doc _id={doc['_id']}")
        continue

    # Remove the _class_id field (not needed without is_root)
    doc.pop('_class_id', None)

    # Insert into proper collection
    try:
        db[target_collection].replace_one({'_id': doc['_id']}, doc, upsert=True)
        print(f"  Migrated _id={doc['_id']} -> {target_collection}")
        migrated += 1
    except Exception as e:
        print(f"  ERROR migrating _id={doc['_id']}: {e}")

print(f"\nMigrated {migrated}/{len(docs)} documents")

# Also fix the counter - old counter was keyed as 'BaseDocument'
old_counter = db['counters'].find_one({'_id': 'BaseDocument'})
if old_counter:
    print(f"\nFound old 'BaseDocument' counter with seq={old_counter['seq']}")
    # We need to create per-collection counters
    # For now, set the admin_users counter since that's the only data
    for target in CLASS_MAP.values():
        target_docs = db[target].count_documents({})
        if target_docs > 0:
            max_id_doc = list(db[target].find().sort('_id', -1).limit(1))
            if max_id_doc:
                max_id = max_id_doc[0]['_id']
                if isinstance(max_id, int):
                    db['counters'].replace_one(
                        {'_id': target},
                        {'_id': target, 'seq': max_id},
                        upsert=True
                    )
                    print(f"  Set counter for '{target}' to seq={max_id}")

print("\nDone! You can now delete the 'BaseDocument' collection if everything looks good.")
print("Collections now:", db.list_collection_names())
