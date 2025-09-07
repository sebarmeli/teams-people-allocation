# 🏗️ Team Allocation Optimizer

A comprehensive web application for optimizing team allocation based on skills, interests, and project requirements. Built with Node.js, Express, and vanilla JavaScript with Google Sheets integration.

## ✨ Features

### 📊 Team Management
- **Card & Table Views**: Toggle between visual cards and spreadsheet-style table views
- **Team Organization**: Automatic team grouping with color-coded badges
- **Skill Tracking**: Track member skills, interests, and career goals
- **Capacity Management**: Configure individual capacity (0.0-1.0 FTE)

### 📋 Project Planning
- **Roadmap Management**: Create and manage quarterly roadmap items
- **Level of Effort (LoE)**: Platform-specific effort estimation (iOS, Android, Web, Backend)
- **Team Assignment**: Assign projects to specific teams
- **Effort Visualization**: Interactive effort breakdown displays

### 🎯 Smart Optimization
- **Intelligent Matching**: Algorithm considers skills, interests, and career goals
- **Platform Specialization**: Bonus scoring for platform-specific expertise
- **Capacity Analysis**: Prevents over-allocation and identifies available capacity
- **Missing FTE Analysis**: Identifies specific developer types needed for unstaffed projects

### 📈 Results & Insights
- **Visual Results Overlay**: Beautiful completion notification with key metrics
- **Recommendations**: AI-powered suggestions for team adjustments
- **Staffing Analysis**: Clear breakdown of fully-staffed, under-staffed, and unstaffed items
- **Utilization Tracking**: Team capacity utilization percentages

### 🔗 Google Sheets Integration
- **Bulk Import**: Import team members and roadmap items from Google Sheets
- **Service Account Authentication**: Secure access to private sheets
- **Flexible Column Mapping**: Automatic detection of various column naming conventions
- **Data Validation**: Comprehensive validation with detailed error reporting

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Google Cloud Service Account (optional, for private sheets)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/team-allocation-optimizer.git
   cd team-allocation-optimizer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup (Optional)**
   Create a `.env` file for Google Sheets integration:
   ```env
   SERVICE_ACCOUNT_PATH=path/to/your/service-account-key.json
   DRIVE_FOLDER_ID=your_google_drive_folder_id
   ```

4. **Start the application**
   ```bash
   npm start
   ```

5. **Open in browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
team-allocation-optimizer/
├── public/                 # Frontend assets
│   ├── index.html         # Main HTML file
│   ├── app.js            # Frontend JavaScript
│   ├── styles.css        # CSS styles
│   └── favicon.svg       # Site favicon
├── src/
│   ├── models.js         # Data models (TeamMember, RoadmapItem, Allocation)
│   ├── optimizer.js      # Optimization algorithm
│   └── web/
│       ├── server.js     # Express server
│       └── google-sheets-service.js  # Google Sheets integration
├── tests/                # Test files
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

## 🧠 Optimization Algorithm

The allocation optimizer uses a sophisticated scoring system:

### Scoring Factors
- **Skill Match (35%)**: Direct skill alignment with project requirements
- **Platform Specialization**: Bonus for iOS, Android, Web, Backend expertise
- **Interest Alignment (25%)**: Personal interests matching project domain
- **Career Goals (20%)**: Growth opportunities alignment
- **Level Appropriateness (10%)**: Seniority level matching project complexity
- **Project Priority (5%)**: Higher priority projects get preference
- **Allocation Efficiency (15%)**: Encourages meaningful allocations

### Platform Skill Mapping
- **iOS**: Swift, Objective-C, Mobile Development
- **Android**: Kotlin, Java, Mobile Development  
- **Web**: JavaScript, React, Vue, Angular, Frontend
- **Backend**: Node.js, Python, API, Database, Server

## 🔧 API Endpoints

### Team Members
- `GET /api/team-members` - Get all team members
- `POST /api/team-members` - Create new team member
- `DELETE /api/team-members/:id` - Delete team member

### Roadmap Items  
- `GET /api/roadmap-items` - Get all roadmap items
- `POST /api/roadmap-items` - Create new roadmap item
- `DELETE /api/roadmap-items/:id` - Delete roadmap item

### Optimization
- `POST /api/optimize` - Run optimization algorithm

### Google Sheets
- `GET /api/sheets/auth-status` - Check authentication status
- `GET /api/sheets/list` - List available spreadsheets
- `POST /api/sheets/import-team` - Import team members from sheet
- `POST /api/sheets/import-roadmap` - Import roadmap items from sheet

## 🎨 UI Features

### Modern Dark Theme
- Gradient headers and accents
- High contrast for accessibility
- Responsive design for mobile devices

### Interactive Elements
- Animated loading states
- Hover effects and transitions
- Modal overlays for results
- Toggle buttons for view switching

### Data Visualization
- Color-coded team badges
- Progress bars for allocations
- Platform-specific icons (📱🤖🌐⚙️)
- Status indicators for project health

## 🔒 Security Features

- Service account path sanitization
- Environment variable protection
- Input validation and sanitization
- Secure Google Sheets API integration

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Sheets API for data integration
- Express.js for the web server
- Modern CSS techniques for the UI design
- The open-source community for inspiration

## 📞 Support

If you have any questions or need help:
- Open an issue on GitHub
- Check the documentation
- Review the code comments for implementation details

---

**Made with ❤️ for better team allocation and project planning**