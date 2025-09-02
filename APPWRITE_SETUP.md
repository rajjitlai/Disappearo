# Appwrite Bad Words Collection Setup

## Collection Structure

Create a new collection in your Appwrite database with the following configuration:

### Collection Details

- **Collection ID:** `bad_words` (or your preferred ID)
- **Name:** Bad Words
- **Description:** Custom bad words for content moderation

### Attributes

#### 1. word (String)

- **Type:** String
- **Size:** 255
- **Required:** Yes
- **Array:** No
- **Default:** None
- **Format:** None

#### 2. category (String)

- **Type:** String
- **Size:** 50
- **Required:** Yes
- **Array:** No
- **Default:** None
- **Format:** None
- **Enum Values:**
  - `profanity`
  - `hate_speech`
  - `threats`
  - `spam`
  - `general`

#### 3. createdAt (String)

- **Type:** String
- **Size:** 255
- **Required:** Yes
- **Array:** No
- **Default:** None
- **Format:** None

### Permissions

- **Read:** Any authenticated user
- **Write:** Any authenticated user (or restrict to admin users if needed)
- **Delete:** Any authenticated user (or restrict to admin users if needed)

### Indexes

Create indexes for better performance:

1. **word_index** on `word` field (ascending)
2. **category_index** on `category` field (ascending)
3. **created_index** on `createdAt` field (descending)

## Import Process

### Option 1: Manual Import via Appwrite Console

1. Go to your Appwrite console
2. Navigate to Database → Collections → bad_words
3. Click "Add Document"
4. Fill in the fields:
   - `word`: The bad word (e.g., "fuck")
   - `category`: The category (e.g., "profanity")
   - `createdAt`: Current timestamp in ISO format

### Option 2: Bulk Import via API

Use the provided `bad-words.txt` file and create a script to bulk import:

```javascript
// Example bulk import script
const badWords = [
  { word: "fuck", category: "profanity" },
  { word: "shit", category: "profanity" },
  // ... more words
];

for (const item of badWords) {
  await databases.createDocument(
    'your_database_id',
    'bad_words',
    ID.unique(),
    {
      word: item.word.toLowerCase().trim(),
      category: item.category,
      createdAt: new Date().toISOString()
    }
  );
}
```

### Option 3: CSV Import

1. Convert the `bad-words.txt` to CSV format
2. Use Appwrite's CSV import feature if available
3. Map columns: word, category, createdAt

## Environment Variable

Add this to your `.env.local`:

```bash
NEXT_PUBLIC_APPWRITE_BAD_WORDS_COLLECTION_ID=your_bad_words_collection_id
```

## Testing

After setup, test the moderation by:

1. Adding some test words to the collection
2. Sending a message containing those words
3. Checking if the moderation API blocks the message
4. Verifying the response includes `reason: "custom_bad_words"`

## Maintenance

- Regularly review and update the word list
- Monitor false positives and adjust accordingly
- Consider adding new categories as needed
- Backup the collection periodically

## Notes

- Words are stored in lowercase for consistent matching
- The system automatically trims whitespace
- Duplicate words are prevented by the application logic
- Categories help organize and manage the word list
- All timestamps are in ISO format for consistency
