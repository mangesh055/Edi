# Sentiment Analysis Feature - StatsFlow

## Overview

The Sentiment Analysis feature automatically analyzes text columns in your datasets and assigns sentiment labels (positive/negative/neutral) with confidence scores. Results are stored in new columns and displayed on the dashboard alongside existing analytics features.

## Features

- **Automatic Text Detection**: Identifies text columns in your dataset suitable for sentiment analysis
- **Multi-Sentiment Engine**: Uses both VADER and TextBlob for robust sentiment classification
- **Confidence Scores**: Provides confidence metrics for each sentiment prediction
- **Polarity & Subjectivity**: Additional metrics to understand sentiment nuance
- **Distribution Analytics**: Visual breakdown of positive, negative, and neutral sentiments
- **Interactive Dashboard**: View sentiment insights directly in the dashboard
- **New Columns**: Creates new columns with sentiment labels, confidence scores, and metrics

## Usage

### 1. Accessing Sentiment Analysis

1. Navigate to the **Dashboard** after cleaning your data
2. Click on the **🎭 Sentiment Analysis** tab
3. The component will automatically detect text columns in your dataset

### 2. Analyzing Sentiment

**Automatic Column Detection:**
- Text columns are automatically identified based on content type
- Columns with average text length > 5 characters are considered for analysis

**Manual Analysis:**
1. Select a text column from the dropdown menu
2. Click **✨ Analyze Sentiment** button
3. Wait for analysis to complete

### 3. Interpreting Results

The sentiment analysis displays:

**Distribution:**
- **😊 Positive**: Count and percentage of positive sentiments
- **😐 Neutral**: Count and percentage of neutral sentiments
- **😞 Negative**: Count and percentage of negative sentiments

**Confidence Scores:**
- **Average**: Mean confidence across all analyzed texts
- **Maximum**: Highest confidence score achieved
- **Minimum**: Lowest confidence score achieved

### 4. Using Sentiment Data

After analysis, new columns are added to your dataset:
- `{column_name}_sentiment`: Label (positive/negative/neutral)
- `{column_name}_confidence`: Confidence score (0-1)
- `{column_name}_polarity`: Polarity score from TextBlob (-1 to 1)
- `{column_name}_subjectivity`: Subjectivity score from TextBlob (0 to 1)

These columns can be used for:
- Filtering and sorting data by sentiment
- Feature engineering and downstream analysis
- Creating visualizations of sentiment trends
- Training ML models with sentiment features

## API Endpoints

### Get Text Columns
```
GET /api/sentiment/text-columns/{session_id}
```
Returns list of columns identified as suitable for sentiment analysis.

### Analyze Sentiment
```
POST /api/sentiment/analyze
Body: {
  "session_id": "string",
  "columns": ["col1", "col2"] or null
}
```
Analyzes sentiment for specified columns or all detected text columns.

### Get Sentiment Summary
```
GET /api/sentiment/summary/{session_id}?column_name=optional
```
Returns sentiment distribution and statistics.

### Analyze Single Text
```
POST /api/sentiment/single
Body: {"text": "string"}
```
Analyzes sentiment for a single text string.

## Technical Details

### Sentiment Classification

The system uses a combination of two sentiment analysis engines:

**VADER (Valence Aware Dictionary and sEntiment Reasoner):**
- Optimized for social media and informal text
- Provides compound score (-1 to 1)
- Excellent for detecting intensity of sentiment

**TextBlob:**
- Uses pattern matching and polarity scores
- Provides:
  - **Polarity**: -1 (negative) to 1 (positive)
  - **Subjectivity**: 0 (objective) to 1 (subjective)

**Final Classification:**
- Compound score ≥ 0.05: **Positive**
- Compound score ≤ -0.05: **Negative**
- -0.05 < Score < 0.05: **Neutral**

### Confidence Scoring

Confidence is derived from VADER's component scores:
- pos, neu, neg (sum to 1.0)
- Represents the proportion of positive/negative/neutral words

### Performance

- Processes ~1000 texts per second
- Handles emojis, contractions, and informal language
- Multilingual support (primarily English, with some support for other languages)

## Example Workflow

1. **Upload Dataset** with customer feedback or reviews
2. **Clean Data** using the cleaning pipeline
3. **Analyze Sentiment** on the feedback column
4. **View Results** in the dashboard
5. **Export** dataset with new sentiment columns
6. **Use for ML** - create features for classification or clustering

## Dependencies

- `textblob==0.17.1` - Polarity and subjectivity analysis
- `nltk==3.8.1` - VADER sentiment analysis

## Best Practices

1. **Use with Clean Text**: Sentiment analysis works best on cleaned, standardized text
2. **Consider Language**: Primarily optimized for English text
3. **Domain-Specific Content**: May have lower accuracy on highly specialized or domain-specific text
4. **Validate Results**: Always review a sample of predictions for your specific use case
5. **Use Confidence Scores**: Filter low-confidence predictions for manual review

## Limitations

- **Language**: Primarily English (VADER and TextBlob are English-focused)
- **Sarcasm**: May misclassify sarcastic text
- **Domain-Specific**: Less accurate on highly specialized terminology
- **Mixed Sentiment**: May struggle with texts containing conflicting sentiments
- **Length**: Works better with longer texts (prefer >10 characters)

## Future Enhancements

- Multi-language support (Spanish, French, etc.)
- Aspect-based sentiment analysis
- Emotion detection (joy, anger, surprise, etc.)
- Fine-tuned transformer models
- Custom sentiment dictionaries
- Real-time sentiment analysis on streaming data

## Troubleshooting

**No text columns detected:**
- Ensure your text columns have average text length > 5 characters
- Check that the column is stored as text/string type

**Low confidence scores:**
- Text may be too short or ambiguous
- May indicate mixed sentiment
- Review the actual text content

**Analysis is slow:**
- Large datasets may take time
- Processing ~1000 texts per second
- Try analyzing one column at a time

## Support

For issues or feature requests related to sentiment analysis, please refer to the StatsFlow documentation or contact support.
