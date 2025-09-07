import { google } from 'googleapis';

export class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.drive = null;
  }

  // Initialize with API key (for read-only access to public sheets)
  initWithApiKey(apiKey) {
    this.auth = apiKey;
    this.sheets = google.sheets({ version: 'v4', auth: apiKey });
    this.drive = google.drive({ version: 'v3', auth: apiKey });
  }

  // Initialize with service account credentials (for full access)
  async initWithServiceAccount(credentials) {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(credentials),
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      });
      
      this.auth = await auth.getClient();
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.drive = google.drive({ version: 'v3', auth: this.auth });
    } catch (error) {
      throw new Error(`Failed to initialize Google Sheets auth: ${error.message}`);
    }
  }

  // Initialize with service account from file path
  async initWithServiceAccountFile(filePath) {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: filePath,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets.readonly',
          'https://www.googleapis.com/auth/drive.readonly'
        ]
      });
      
      this.auth = await auth.getClient();
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.drive = google.drive({ version: 'v3', auth: this.auth });
    } catch (error) {
      throw new Error(`Failed to initialize Google Sheets auth from file: ${error.message}`);
    }
  }

  // Extract sheet ID from Google Sheets URL
  extractSheetId(url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      throw new Error('Invalid Google Sheets URL. Please provide a valid Google Sheets URL.');
    }
    return match[1];
  }

  // Get team members from Google Sheets
  async getTeamMembersFromSheet(sheetUrl, range = 'A1:G100') {
    try {
      if (!this.sheets) {
        throw new Error('Google Sheets service not initialized. Please provide API key or service account credentials.');
      }

      const sheetId = this.extractSheetId(sheetUrl);
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        throw new Error('No data found in the specified range.');
      }

      // Assume first row is headers
      const headers = rows[0].map(h => h.toLowerCase().trim());
      const dataRows = rows.slice(1);

      const teamMembers = [];

      for (const row of dataRows) {
        if (row.length === 0 || !row[0]) continue; // Skip empty rows

        const member = this.parseTeamMemberRow(headers, row);
        if (member) {
          teamMembers.push(member);
        }
      }

      return teamMembers;
    } catch (error) {
      if (error.code === 403) {
        throw new Error('Access denied. Please check your API key or make sure the sheet is publicly accessible.');
      } else if (error.code === 404) {
        throw new Error('Sheet not found. Please check the URL and make sure the sheet exists.');
      } else {
        throw new Error(`Error reading from Google Sheets: ${error.message}`);
      }
    }
  }

  // Parse a single row into a team member object
  parseTeamMemberRow(headers, row) {
    try {
      const getValue = (possibleKeys) => {
        for (const key of possibleKeys) {
          const index = headers.indexOf(key);
          if (index !== -1 && row[index]) {
            return row[index].trim();
          }
        }
        return '';
      };

      const getArrayValue = (possibleKeys) => {
        const value = getValue(possibleKeys);
        return value ? value.split(',').map(s => s.trim()).filter(s => s) : [];
      };

      const getNumberValue = (possibleKeys, defaultValue = 1.0) => {
        const value = getValue(possibleKeys);
        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultValue : Math.max(0, Math.min(1, parsed));
      };

      // New structure: First name, Last name, Team name, Level, Location, Career goals, Notes
      const firstName = getValue(['first name', 'firstname', 'first_name']);
      const lastName = getValue(['last name', 'lastname', 'last_name']);
      const teamName = getValue(['team name', 'team', 'teamname', 'team_name']);
      
      if (!firstName && !lastName) return null; // Skip rows without names
      
      // Combine first and last name
      const name = [firstName, lastName].filter(Boolean).join(' ');
      
      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: name,
        level: getValue(['level', 'experience level', 'seniority', 'title']) || 'Mid',
        skills: [], // Not in the new structure, but keeping for compatibility
        capacity: 1.0, // Not in the new structure, defaulting to full capacity
        interests: teamName ? [teamName] : [], // Using team name as interest
        careerGoals: getArrayValue(['career goals', 'goals', 'career aspirations', 'development goals']),
        // Additional fields from new structure
        teamName: teamName,
        location: getValue(['location', 'office', 'city']),
        notes: getValue(['notes', 'comments', 'remarks']),
        dateAdded: new Date().toISOString(),
        importedFrom: 'google-sheets'
      };
    } catch (error) {
      console.warn(`Error parsing row: ${error.message}`, row);
      return null;
    }
  }

  // Get sheet metadata (name, worksheets, etc.)
  async getSheetMetadata(sheetUrl) {
    try {
      if (!this.sheets) {
        throw new Error('Google Sheets service not initialized.');
      }

      const sheetId = this.extractSheetId(sheetUrl);
      
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });

      const spreadsheet = response.data;
      
      return {
        title: spreadsheet.properties.title,
        sheetId: sheetId,
        worksheets: spreadsheet.sheets.map(sheet => ({
          title: sheet.properties.title,
          sheetId: sheet.properties.sheetId,
          gridProperties: sheet.properties.gridProperties
        }))
      };
    } catch (error) {
      throw new Error(`Error getting sheet metadata: ${error.message}`);
    }
  }

  // Validate sheet structure and provide recommendations
  async validateSheetStructure(sheetUrl, range = 'A1:Z1') {
    try {
      const sheetId = this.extractSheetId(sheetUrl);
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
      });

      const headers = response.data.values?.[0] || [];
      const normalizedHeaders = headers.map(h => h.toLowerCase().trim());

      const recommendations = [];
      const requiredFields = {
        firstName: ['first name', 'firstname', 'first_name'],
        lastName: ['last name', 'lastname', 'last_name'],
        teamName: ['team name', 'team', 'teamname', 'team_name'],
        level: ['level', 'experience level', 'seniority', 'title'],
        location: ['location', 'office', 'city'],
        careerGoals: ['career goals', 'goals', 'career aspirations', 'development goals'],
        notes: ['notes', 'comments', 'remarks']
      };

      const foundFields = {};

      for (const [field, possibleNames] of Object.entries(requiredFields)) {
        const found = possibleNames.find(name => normalizedHeaders.includes(name));
        foundFields[field] = found || null;
        
        if (!found && (field === 'firstName' || field === 'lastName')) {
          recommendations.push(`⚠️ Required "${possibleNames[0]}" column not found. Please add a column with ${field === 'firstName' ? 'first names' : 'last names'}.`);
        } else if (!found) {
          recommendations.push(`💡 Consider adding a "${possibleNames[0]}" column for better data import.`);
        }
      }

      if (recommendations.length === 0) {
        recommendations.push('✅ Sheet structure looks good! Ready to import.');
      }

      return {
        valid: foundFields.firstName !== null || foundFields.lastName !== null,
        headers: headers,
        foundFields: foundFields,
        recommendations: recommendations
      };
    } catch (error) {
      throw new Error(`Error validating sheet structure: ${error.message}`);
    }
  }

  // List Google Sheets from user's Drive
  async listGoogleSheets(folderId = null, maxResults = 20) {
    try {
      if (!this.drive) {
        throw new Error('Drive service not initialized');
      }

      const query = folderId 
        ? `'${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
        : `mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;

      const response = await this.drive.files.list({
        q: query,
        pageSize: maxResults,
        fields: 'files(id,name,modifiedTime,createdTime,owners,shared,webViewLink)',
        orderBy: 'modifiedTime desc'
      });

      const files = response.data.files || [];
      
      return files.map(file => ({
        id: file.id,
        name: file.name,
        url: `https://docs.google.com/spreadsheets/d/${file.id}`,
        webViewLink: file.webViewLink,
        modifiedTime: file.modifiedTime,
        createdTime: file.createdTime,
        owners: file.owners || [],
        shared: file.shared || false
      }));

    } catch (error) {
      throw new Error(`Error listing Google Sheets: ${error.message}`);
    }
  }

  // Search Google Sheets by name
  async searchGoogleSheets(searchTerm, maxResults = 10) {
    try {
      if (!this.drive) {
        throw new Error('Drive service not initialized');
      }

      const query = `mimeType='application/vnd.google-apps.spreadsheet' and name contains '${searchTerm}' and trashed=false`;

      const response = await this.drive.files.list({
        q: query,
        pageSize: maxResults,
        fields: 'files(id,name,modifiedTime,createdTime,owners,webViewLink)',
        orderBy: 'modifiedTime desc'
      });

      const files = response.data.files || [];
      
      return files.map(file => ({
        id: file.id,
        name: file.name,
        url: `https://docs.google.com/spreadsheets/d/${file.id}`,
        webViewLink: file.webViewLink,
        modifiedTime: file.modifiedTime,
        createdTime: file.createdTime,
        owners: file.owners || []
      }));

    } catch (error) {
      throw new Error(`Error searching Google Sheets: ${error.message}`);
    }
  }

  // Get sheets from a specific folder (like the DRIVE_FOLDER_ID)
  async getSheetsFromFolder(folderId) {
    try {
      if (!folderId) {
        throw new Error('Folder ID is required');
      }

      return await this.listGoogleSheets(folderId, 50);
    } catch (error) {
      throw new Error(`Error getting sheets from folder: ${error.message}`);
    }
  }

  // Get roadmap items from Google Sheets
  async getRoadmapItemsFromSheet(sheetUrl, range = 'A1:H100') {
    try {
      if (!this.sheets) {
        throw new Error('Google Sheets service not initialized. Please provide API key or service account credentials.');
      }

      const sheetId = this.extractSheetId(sheetUrl);
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        throw new Error('No data found in the specified range.');
      }

      // Assume first row is headers
      const headers = rows[0].map(h => h.toLowerCase().trim());
      const dataRows = rows.slice(1);

      const roadmapItems = [];

      for (const row of dataRows) {
        if (row.length === 0 || !row[0]) continue; // Skip empty rows

        const item = this.parseRoadmapItemRow(headers, row);
        if (item) {
          roadmapItems.push(item);
        }
      }

      return roadmapItems;
    } catch (error) {
      if (error.code === 403) {
        throw new Error('Access denied. Please check your API key or make sure the sheet is publicly accessible.');
      } else if (error.code === 404) {
        throw new Error('Sheet not found. Please check the URL and make sure the sheet exists.');
      } else {
        throw new Error(`Error reading from Google Sheets: ${error.message}`);
      }
    }
  }

  // Parse a single row into a roadmap item object
  parseRoadmapItemRow(headers, row) {
    try {
      const getValue = (possibleKeys) => {
        for (const key of possibleKeys) {
          const index = headers.indexOf(key);
          if (index !== -1 && row[index]) {
            return row[index].trim();
          }
        }
        return '';
      };

      const getArrayValue = (possibleKeys) => {
        const value = getValue(possibleKeys);
        return value ? value.split(',').map(s => s.trim()).filter(s => s) : [];
      };

      const getWeeksValue = (possibleKeys, defaultValue = 0) => {
        const value = getValue(possibleKeys);
        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultValue : Math.max(0, parsed);
      };

      // New structure: Theme, Item, Team, LoE iOS engineer (weeks), LoE Android (weeks), LoE Web (weeks), LoE Backend (weeks)
      const theme = getValue(['theme', 'category', 'epic']);
      const item = getValue(['item', 'name', 'project name', 'title']);
      const team = getValue(['team', 'assigned team', 'owner team']);
      if (!item) return null; // Skip rows without item names
      
      // Get Level of Effort for different disciplines
      const loeIOS = getWeeksValue(['loe ios engineer (weeks)', 'loe ios', 'ios weeks', 'ios effort']);
      const loeAndroid = getWeeksValue(['loe android (weeks)', 'loe android', 'android weeks', 'android effort']);
      const loeWeb = getWeeksValue(['loe web (weeks)', 'loe web', 'web weeks', 'web effort', 'frontend weeks']);
      const loeBackend = getWeeksValue(['loe backend (weeks)', 'loe backend', 'backend weeks', 'backend effort']);
      
      // Calculate total effort and determine primary skills needed
      const totalWeeks = loeIOS + loeAndroid + loeWeb + loeBackend;
      const requiredSkills = [];
      if (loeIOS > 0) requiredSkills.push('iOS', 'Swift', 'Mobile Development');
      if (loeAndroid > 0) requiredSkills.push('Android', 'Kotlin', 'Mobile Development');
      if (loeWeb > 0) requiredSkills.push('Frontend', 'JavaScript', 'React', 'Web Development');
      if (loeBackend > 0) requiredSkills.push('Backend', 'API Development', 'Database');
      
      // Determine complexity based on total effort and number of platforms
      const platformCount = [loeIOS, loeAndroid, loeWeb, loeBackend].filter(weeks => weeks > 0).length;
      let complexity = 1;
      if (totalWeeks > 12) complexity = 5; // Very complex (3+ months)
      else if (totalWeeks > 8) complexity = 4; // Complex (2+ months)
      else if (totalWeeks > 4) complexity = 3; // Moderate (1+ month)
      else if (totalWeeks > 1) complexity = 2; // Simple
      
      // Adjust complexity based on platform count (cross-platform is more complex)
      if (platformCount > 2) complexity = Math.min(5, complexity + 1);
      
      // Determine size (1-5 scale) based on total weeks
      let size = 1;
      if (totalWeeks > 16) size = 5; // Very large (4+ months)
      else if (totalWeeks > 8) size = 4; // Large (2+ months)
      else if (totalWeeks > 4) size = 3; // Medium (1+ month)
      else if (totalWeeks > 1) size = 2; // Small
      
      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: item,
        description: theme ? `${theme}: ${item}` : item,
        size: size,
        complexity: complexity,
        requiredSkills: requiredSkills,
        domain: theme || 'Product Development',
        minLevel: totalWeeks > 8 ? 'Mid' : 'Junior', // Larger projects need more experienced people
        careerOpportunities: platformCount > 1 ? ['Cross-platform development', 'Full-stack experience'] : [],
        // Team assignment
        assignedTeam: team || null,
        // LoE breakdown for allocation
        effortBreakdown: {
          ios: loeIOS,
          android: loeAndroid,
          web: loeWeb,
          backend: loeBackend,
          total: totalWeeks
        },
        platformCount: platformCount,
        dateAdded: new Date().toISOString(),
        importedFrom: 'google-sheets'
      };
    } catch (error) {
      console.warn(`Error parsing roadmap item row: ${error.message}`, row);
      return null;
    }
  }

  // Validate roadmap sheet structure and provide recommendations
  async validateRoadmapSheetStructure(sheetUrl, range = 'A1:Z1') {
    try {
      const sheetId = this.extractSheetId(sheetUrl);
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
      });

      const headers = response.data.values?.[0] || [];
      const normalizedHeaders = headers.map(h => h.toLowerCase().trim());

      const recommendations = [];
      const requiredFields = {
        theme: ['theme', 'category', 'epic'],
        item: ['item', 'name', 'project name', 'title'],
        team: ['team', 'assigned team', 'owner team'],
        loeIOS: ['loe ios engineer (weeks)', 'loe ios', 'ios weeks', 'ios effort'],
        loeAndroid: ['loe android (weeks)', 'loe android', 'android weeks', 'android effort'],
        loeWeb: ['loe web (weeks)', 'loe web', 'web weeks', 'web effort', 'frontend weeks'],
        loeBackend: ['loe backend (weeks)', 'loe backend', 'backend weeks', 'backend effort']
      };

      const foundFields = {};

      for (const [field, possibleNames] of Object.entries(requiredFields)) {
        const found = possibleNames.find(name => normalizedHeaders.includes(name));
        foundFields[field] = found || null;
        
        if (!found && field === 'item') {
          recommendations.push('⚠️ Required "Item" column not found. Please add a column with project/item names.');
        } else if (!found && field.startsWith('loe')) {
          const platform = field.replace('loe', '').toUpperCase();
          recommendations.push(`💡 Consider adding "${possibleNames[0]}" column for ${platform} effort estimation.`);
        } else if (!found) {
          recommendations.push(`💡 Consider adding a "${possibleNames[0]}" column for better data import.`);
        }
      }

      // Check if at least one LoE column exists
      const hasAnyLoE = foundFields.loeIOS || foundFields.loeAndroid || foundFields.loeWeb || foundFields.loeBackend;
      if (!hasAnyLoE) {
        recommendations.push('⚠️ No Level of Effort (LoE) columns found. Please add at least one LoE column for effort estimation.');
      }

      if (recommendations.length === 0) {
        recommendations.push('✅ Sheet structure looks good! Ready to import roadmap items with effort breakdown.');
      }

      return {
        valid: foundFields.item !== null,
        headers: headers,
        foundFields: foundFields,
        recommendations: recommendations
      };
    } catch (error) {
      throw new Error(`Error validating roadmap sheet structure: ${error.message}`);
    }
  }
}