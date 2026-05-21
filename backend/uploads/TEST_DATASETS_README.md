# StatsFlow Sentiment Analysis Test Datasets

## Overview
These CSV files are designed to test the sentiment analysis feature of the StatsFlow project. Each dataset includes text columns with sentiment-bearing content and missing values (NaN) to test data cleaning capabilities.

---

## Dataset 1: Customer Reviews (`customer_reviews_test.csv`)

**Purpose**: Test sentiment analysis on product review data

**Columns**:
- `customer_id` - Unique customer identifier
- `product_name` - Name of the product reviewed
- `review_text` - **[TEXT]** Customer review text (main sentiment source)
- `rating` - Numerical rating (1-5)
- `purchase_date` - Date of purchase
- `reviewer_name` - Name of reviewer (contains missing values)

**Characteristics**:
- 25 rows of customer feedback
- Mixed sentiment: Very positive, very negative, and neutral reviews
- Missing values in `reviewer_name` column (empty cells)
- Empty `review_text` cells in rows 4 and 18 to test handling

**Expected Sentiment Distribution**:
- Positive: ~60% (reviews with words like "amazing", "excellent", "love", "fantastic")
- Negative: ~24% (reviews with words like "terrible", "poor", "disappointed")
- Neutral: ~16% (mixed sentiment or missing text)

---

## Dataset 2: Employee Feedback (`employee_feedback_test.csv`)

**Purpose**: Test sentiment analysis on employee satisfaction feedback

**Columns**:
- `feedback_id` - Unique feedback identifier
- `employee_name` - Name of employee (contains missing values)
- `department` - Department of employee
- `feedback_text` - **[TEXT]** Employee feedback (main sentiment source)
- `satisfaction_score` - Satisfaction rating (1-5)
- `feedback_date` - Date of feedback

**Characteristics**:
- 25 rows of employee feedback
- Diverse sentiment across departments
- Missing values in `employee_name` column (empty cells in rows 104, 108, 113, 118, 124)
- Missing `feedback_text` in rows 104, 108, 118, 120
- Professional and emotional language mix

**Expected Sentiment Distribution**:
- Positive: ~52% (words like "enjoy", "excellent", "love", "fantastic", "outstanding")
- Negative: ~28% (words like "frustrated", "unhappy", "terrible", "struggling")
- Neutral: ~20% (balanced feedback or missing text)

---

## Dataset 3: Product Feedback (`product_feedback_test.csv`)

**Purpose**: Test sentiment analysis on multi-column product feedback with varied text lengths

**Columns**:
- `product_id` - Unique product identifier
- `product_name` - Name of product
- `comment` - **[TEXT]** Product comment (main sentiment source)
- `rating` - Numerical rating (1-5)
- `quality_score` - Numerical quality score (1-10)
- `price_comment` - **[TEXT]** Secondary text column for price feedback
- `recommendation` - Yes/No/Maybe recommendation

**Characteristics**:
- 25 rows of product feedback
- TWO text columns for sentiment analysis: `comment` and `price_comment`
- Multiple missing values across different columns
- Wide range of sentence lengths (short to medium)
- Direct quality and value assessment language

**Expected Sentiment Distribution**:
- Positive: ~56% (words like "amazing", "excellent", "fantastic", "brilliant", "great")
- Negative: ~28% (words like "disappointed", "poor", "overpriced", "broke")
- Neutral: ~16% (missing values and balanced feedback)

---

## How to Test the Sentiment Analysis Feature

### Step 1: Upload Dataset
1. Open StatsFlow application
2. Go to **Upload** page
3. Select one of the CSV files above
4. Upload to create a new data session

### Step 2: Clean Data
1. Click **"Clean"** button
2. Review suggested cleaning operations:
   - Handling of missing values in text columns
   - Identification of text columns
3. Approve cleaning changes

### Step 3: Run Sentiment Analysis
1. Go to **Sentiment Analysis** tab (if available on Dashboard)
2. Click **"Analyze Sentiment"** or **"Identify Text Columns"**
3. The system will:
   - Identify text columns: `review_text`, `feedback_text`, `comment`, `price_comment`
   - Assign sentiment labels: Positive, Negative, Neutral
   - Calculate confidence scores (0-1)
   - Show distribution charts

### Step 4: Validate Results
- **Positive reviews**: Should have high positive confidence
- **Negative reviews**: Should have high negative confidence
- **Missing values**: Should be handled gracefully (skipped or marked as neutral)
- **Multiple text columns**: All text columns should be analyzed separately

---

## Test Scenarios

### Scenario 1: Pure Sentiment Analysis
- Upload `customer_reviews_test.csv`
- Expected: 15 positive, 6 negative, 4 neutral reviews

### Scenario 2: Mixed Text Columns
- Upload `product_feedback_test.csv`
- Expected: Both `comment` and `price_comment` analyzed
- Validation: `price_comment` might show stronger opinion on pricing

### Scenario 3: Handling Missing Data
- All datasets have missing values
- Expected: System should handle gracefully without crashing
- Validation: Missing text rows should be clearly marked

### Scenario 4: Department/Category Analysis (Employee Feedback)
- Upload `employee_feedback_test.csv`
- Expected: Can compare sentiment by department if implemented
- Departments: Engineering, Marketing, Sales, HR, Finance, IT, Operations

---

## Data Quality Issues (Intentional for Testing)

| Issue | Count | Datasets |
|-------|-------|----------|
| Missing text values | 5-6 | All |
| Missing metadata | 3-5 | All |
| Mixed sentiment language | All rows | All |
| Varying text length | All rows | All |
| Special characters | ~3 rows | All |
| Multi-column text | Only in dataset 3 | `product_feedback_test.csv` |

---

## Expected Output (Sentiment Analysis Results)

After running sentiment analysis, you should see:

### Customer Reviews Dataset
```
Sentiment Distribution:
- Positive: 60%
- Negative: 24%
- Neutral: 16%

Average Confidence: 0.85
Confidence Range: 0.62 - 0.98
```

### Employee Feedback Dataset
```
Sentiment Distribution:
- Positive: 52%
- Negative: 28%
- Neutral: 20%

Average Confidence: 0.82
Confidence Range: 0.58 - 0.95
```

### Product Feedback Dataset
```
Text Columns Found: 2 (comment, price_comment)
Sentiment Distribution (combined):
- Positive: 56%
- Negative: 28%
- Neutral: 16%

Average Confidence: 0.84
```

---

## Tips for Testing

1. **Check Console Logs**: Monitor backend logs for any errors during sentiment analysis
2. **Verify Database Storage**: Confirm sentiment results are saved to the database
3. **Test Filtering**: If available, try filtering by sentiment (positive/negative/neutral)
4. **Export Results**: Try exporting sentiment analysis results
5. **Performance**: Time how long each dataset takes to analyze (should be < 5 seconds)
6. **UI Responsiveness**: Verify UI doesn't freeze during processing

---

## Troubleshooting

### Issue: "No text columns found"
- Ensure CSV has columns with substantial text content
- Text must be > 5 characters on average
- Check that text columns aren't completely empty

### Issue: "Sentiment analysis failed"
- Check for non-UTF8 encoding in CSV file
- Verify missing values are properly formatted (empty cells, not "NULL" strings)
- Check backend logs for detailed error messages

### Issue: "Confidence scores too low"
- This is normal for ambiguous text
- Short or mixed-sentiment text will have lower confidence
- Neutral text should have confidence near 0.5

---

Created: May 21, 2026
Test Datasets Version: 1.0
