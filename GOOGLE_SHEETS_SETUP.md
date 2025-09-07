# 📊 Google Sheets Integration Setup Guide

This guide explains how to set up and use the Google Sheets integration to import team member data into the Team Allocation Optimizer.

## 🚀 Quick Start

1. **Get a Google Sheets API Key**
2. **Create or prepare your Google Sheet**
3. **Use the import feature in the web UI**

---

## 📋 Step 1: Get Google Sheets API Key

### Option A: Simple API Key (Recommended for Public Sheets)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Library**
4. Search for "Google Sheets API" and enable it
5. Go to **APIs & Services** > **Credentials**
6. Click **Create Credentials** > **API Key**
7. Copy your API key (keep it secure!)

### Option B: Service Account (For Private Sheets)

1. In Google Cloud Console, go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **Service Account**
3. Fill in the details and create the account
4. Generate a JSON key file for the service account
5. Share your Google Sheet with the service account email address

---

## 📊 Step 2: Prepare Your Google Sheet

### Sheet Structure

Your Google Sheet should have these columns (in any order):

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| **Name** | ✅ Yes | Team member's name | "Alice Johnson" |
| **Level** | No | Experience level | "Senior", "Mid", "Junior" |
| **Skills** | No | Technical skills (comma-separated) | "JavaScript, React, Node.js" |
| **Capacity** | No | Availability (0.0 to 1.0) | "1.0" (full-time), "0.5" (half-time) |
| **Interests** | No | Areas of interest (comma-separated) | "Frontend, User Experience" |
| **Career Goals** | No | Career aspirations (comma-separated) | "Leadership, Mentoring" |
| **Notes** | No | Additional information | "Team lead with 5+ years experience" |

### Sample Google Sheet

Create a sheet with this format:

```
| Name           | Level  | Skills                    | Capacity | Interests           | Career Goals           | Notes                    |
|----------------|--------|---------------------------|----------|---------------------|------------------------|--------------------------|
| Alice Johnson  | Senior | JavaScript, React, Node.js| 1.0      | Frontend, UX        | Leadership, Mentoring  | Team lead, 5+ years exp  |
| Bob Smith      | Mid    | Python, Django, SQL       | 0.8      | Backend, Data       | Architecture, Cloud    | Backend specialist       |
| Carol Davis    | Junior | HTML, CSS, JavaScript     | 1.0      | Frontend, Design    | Technical Growth       | Recent graduate          |
```

### Making Your Sheet Accessible

**For Public Sheets (API Key method):**
1. Click **Share** in your Google Sheet
2. Change access to "Anyone with the link can view"
3. Copy the sheet URL

**For Private Sheets (Service Account method):**
1. Share the sheet with your service account email
2. Give "Viewer" permissions
3. Copy the sheet URL

---

## 💻 Step 3: Import Using the Web UI

1. **Open the Team Allocation Optimizer** at http://localhost:3000
2. **Navigate to the Team Members tab**
3. **Click "📊 Import from Google Sheets"**
4. **Follow the 3-step wizard:**

### Step 1: Setup
- Enter your API key
- Paste your Google Sheets URL
- Specify the range (default: A1:G100)
- Click "Validate & Preview"

### Step 2: Preview & Import
- Review the sheet structure analysis
- Check validation results and recommendations
- Choose whether to replace existing members or add new ones
- Click "Import Team Members"

### Step 3: Results
- View import statistics
- See the list of imported members
- Click "Done" or import another sheet

---

## 🔧 Advanced Configuration

### Custom Column Names

The system recognizes various column header names:

- **Name**: "name", "full name", "employee name", "team member"
- **Level**: "level", "experience level", "seniority", "title"
- **Skills**: "skills", "technical skills", "expertise", "technologies"
- **Capacity**: "capacity", "availability", "fte", "workload"
- **Interests**: "interests", "areas of interest", "domains", "preferences"
- **Career Goals**: "career goals", "goals", "career aspirations", "development goals"

### Data Format Guidelines

- **Skills, Interests, Career Goals**: Use comma-separated values
- **Capacity**: Number between 0.0 (unavailable) and 1.0 (full-time)
- **Level**: Intern, Junior, Mid, Senior, Staff, Principal, Architect
- **Empty cells**: Will be ignored or filled with defaults

### Range Specification

- **Default**: A1:G100 (first 100 rows, columns A-G)
- **Custom examples**: 
  - A1:Z50 (first 50 rows, all columns)
  - Sheet1!A1:G100 (specific worksheet)
  - B2:H200 (skip first row, different starting column)

---

## 🛠️ Troubleshooting

### Common Issues

**"Access denied" Error**
- Check your API key is correct
- Ensure the sheet is publicly accessible or shared with service account
- Verify the Google Sheets API is enabled

**"Sheet not found" Error**
- Verify the Google Sheets URL is correct
- Make sure the sheet exists and isn't deleted
- Check if you have permission to access the sheet

**"No valid team members found" Error**
- Ensure you have a "Name" column with actual names
- Check that data starts from the correct row
- Verify the range specification includes your data

**"Invalid Google Sheets URL" Error**
- Use the full URL from your browser address bar
- Format should be: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/...`

### Data Import Issues

**Missing Skills/Interests**
- Use comma-separated values: "JavaScript, React, CSS"
- Avoid special characters or extra spaces
- Check spelling and formatting

**Incorrect Capacity Values**
- Use decimal numbers between 0.0 and 1.0
- Examples: 1.0 (full-time), 0.5 (half-time), 0.2 (20% capacity)

**Duplicate Team Members**
- By default, duplicates (same name) are skipped
- Use "Replace existing" option to overwrite all data

---

## 🔒 Security Notes

- **Keep your API key secure** - don't share it publicly
- **Use environment variables** for production deployments
- **Regularly rotate API keys** for enhanced security
- **Consider service accounts** for production use
- **Review sheet sharing permissions** regularly

---

## 📈 Tips for Best Results

1. **Consistent Naming**: Use consistent column headers across sheets
2. **Clean Data**: Remove empty rows and ensure data quality
3. **Test First**: Try with a small sample before importing large datasets
4. **Backup**: Keep a backup of your team data before replacing
5. **Validation**: Always review the validation results before importing

---

## 🆘 Need Help?

If you encounter issues:

1. Check the validation step for specific recommendations
2. Review the troubleshooting section above
3. Verify your Google Sheets API setup
4. Test with the sample template provided in the UI

The system provides detailed error messages and validation feedback to help you resolve issues quickly.

---

## 📝 Example Workflows

### Workflow 1: Initial Team Import
1. Create a new Google Sheet with your team data
2. Make it publicly accessible
3. Get an API key
4. Import using "Replace existing" option

### Workflow 2: Adding New Team Members
1. Add new rows to your existing sheet
2. Import using the same settings (don't check "Replace existing")
3. New members will be added, existing ones preserved

### Workflow 3: Regular Updates
1. Maintain your team data in Google Sheets
2. Periodically sync changes using the import feature
3. Use "Replace existing" to update all information

This integration makes it easy to manage your team data in a familiar spreadsheet format while leveraging the powerful allocation optimization features of the application.