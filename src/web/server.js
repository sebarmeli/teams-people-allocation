#!/usr/bin/env node

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { TeamMember, RoadmapItem } from '../models.js';
import { AllocationOptimizer } from '../optimizer.js';
import { GoogleSheetsService } from './google-sheets-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

// Data file paths (use absolute paths for better Vercel compatibility)
const projectRoot = path.join(__dirname, '../..');
const TEAM_MEMBERS_FILE = path.join(projectRoot, 'team-members.json');
const ROADMAP_ITEMS_FILE = path.join(projectRoot, 'roadmap-items.json');

// Default data for when files are not available (especially in serverless environments like Vercel)
let defaultRoadmapItems = [];
let defaultTeamMembers = [];

// Initialize default data from files if available (for local development)
function initializeDefaultData() {
  try {
    if (fs.existsSync(ROADMAP_ITEMS_FILE)) {
      const data = fs.readFileSync(ROADMAP_ITEMS_FILE, 'utf8');
      defaultRoadmapItems = JSON.parse(data);
      console.log(`Initialized ${defaultRoadmapItems.length} default roadmap items`);
    }
  } catch (error) {
    console.log('Could not load default roadmap items:', error.message);
  }
  
  try {
    if (fs.existsSync(TEAM_MEMBERS_FILE)) {
      const data = fs.readFileSync(TEAM_MEMBERS_FILE, 'utf8');
      defaultTeamMembers = JSON.parse(data);
      console.log(`Initialized ${defaultTeamMembers.length} default team members`);
    }
  } catch (error) {
    console.log('Could not load default team members:', error.message);
  }
}

// Initialize default data on startup
initializeDefaultData();

// Helper functions
function readDataFile(filename) {
  try {
    console.log(`Attempting to read file: ${filename}`);
    if (fs.existsSync(filename)) {
      const data = fs.readFileSync(filename, 'utf8');
      const parsed = JSON.parse(data);
      console.log(`Successfully read ${parsed.length} items from ${filename}`);
      return parsed;
    } else {
      console.log(`File not found: ${filename}, checking for defaults`);
      // Return appropriate default data based on filename
      if (filename.includes('roadmap')) {
        console.log(`Returning default roadmap items (${defaultRoadmapItems.length} items)`);
        return defaultRoadmapItems;
      } else if (filename.includes('team')) {
        console.log(`Returning default team members (${defaultTeamMembers.length} members)`);
        return defaultTeamMembers;
      }
      return [];
    }
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    // Return appropriate default data on error
    if (filename.includes('roadmap')) {
      return defaultRoadmapItems;
    } else if (filename.includes('team')) {
      return defaultTeamMembers;
    }
    return [];
  }
}

function writeDataFile(filename, data) {
  try {
    // Ensure directory exists
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`Successfully wrote ${data.length} items to ${filename}`);
    return true;
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    return false;
  }
}

// API Routes

// Get all team members
app.get('/api/team-members', (req, res) => {
  const teamMembers = readDataFile(TEAM_MEMBERS_FILE);
  res.json(teamMembers);
});

// Add a new team member
app.post('/api/team-members', (req, res) => {
  const { name, level, skills, capacity, interests, careerGoals } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const teamMembers = readDataFile(TEAM_MEMBERS_FILE);
  
  const newMember = {
    id: Date.now().toString(),
    name: name.trim(),
    level: level || 'Mid',
    skills: Array.isArray(skills) ? skills : [],
    capacity: typeof capacity === 'number' ? capacity : 1.0,
    interests: Array.isArray(interests) ? interests : [],
    careerGoals: Array.isArray(careerGoals) ? careerGoals : [],
    dateAdded: new Date().toISOString()
  };

  teamMembers.push(newMember);
  
  if (writeDataFile(TEAM_MEMBERS_FILE, teamMembers)) {
    res.status(201).json(newMember);
  } else {
    res.status(500).json({ error: 'Failed to save team member' });
  }
});

// Delete a team member
app.delete('/api/team-members/:id', (req, res) => {
  const { id } = req.params;
  const teamMembers = readDataFile(TEAM_MEMBERS_FILE);
  
  const index = teamMembers.findIndex(member => member.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Team member not found' });
  }

  teamMembers.splice(index, 1);
  
  if (writeDataFile(TEAM_MEMBERS_FILE, teamMembers)) {
    res.json({ message: 'Team member deleted successfully' });
  } else {
    res.status(500).json({ error: 'Failed to delete team member' });
  }
});

// Get all roadmap items
app.get('/api/roadmap-items', (req, res) => {
  try {
    const roadmapItems = readDataFile(ROADMAP_ITEMS_FILE);
    console.log(`API: Returning ${roadmapItems.length} roadmap items`);
    res.json(roadmapItems);
  } catch (error) {
    console.error('Error in /api/roadmap-items:', error);
    // Return empty array on error to prevent frontend crashes
    res.json([]);
  }
});

// Add a new roadmap item
app.post('/api/roadmap-items', (req, res) => {
  const { name, description, size, complexity, requiredSkills, domain, minLevel, careerOpportunities } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const roadmapItems = readDataFile(ROADMAP_ITEMS_FILE);
  
  const newItem = {
    id: Date.now().toString(),
    name: name.trim(),
    description: description || '',
    size: typeof size === 'number' ? size : 1,
    complexity: typeof complexity === 'number' ? complexity : 1,
    requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : [],
    domain: domain || '',
    minLevel: minLevel || 'Junior',
    careerOpportunities: Array.isArray(careerOpportunities) ? careerOpportunities : [],
    dateAdded: new Date().toISOString()
  };

  roadmapItems.push(newItem);
  
  if (writeDataFile(ROADMAP_ITEMS_FILE, roadmapItems)) {
    res.status(201).json(newItem);
  } else {
    res.status(500).json({ error: 'Failed to save roadmap item' });
  }
});

// Delete a roadmap item
app.delete('/api/roadmap-items/:id', (req, res) => {
  const { id } = req.params;
  const roadmapItems = readDataFile(ROADMAP_ITEMS_FILE);
  
  const index = roadmapItems.findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Roadmap item not found' });
  }

  roadmapItems.splice(index, 1);
  
  if (writeDataFile(ROADMAP_ITEMS_FILE, roadmapItems)) {
    res.json({ message: 'Roadmap item deleted successfully' });
  } else {
    res.status(500).json({ error: 'Failed to delete roadmap item' });
  }
});

// Run allocation optimization
app.post('/api/optimize', (req, res) => {
  try {
    const teamMembersData = readDataFile(TEAM_MEMBERS_FILE);
    const roadmapItemsData = readDataFile(ROADMAP_ITEMS_FILE);

    if (teamMembersData.length === 0) {
      return res.status(400).json({ error: 'No team members found. Please add team members first.' });
    }

    if (roadmapItemsData.length === 0) {
      return res.status(400).json({ error: 'No roadmap items found. Please add roadmap items first.' });
    }

    // Convert data to model instances
    const teamMembers = teamMembersData.map(data => 
      new TeamMember(data.name, data.level, data.skills, data.capacity, data.interests, data.careerGoals)
    );

    const roadmapItems = roadmapItemsData.map(data =>
      new RoadmapItem(data.name, data.description, data.size, data.complexity, data.requiredSkills, data.domain, data.minLevel, data.careerOpportunities)
    );

    // Run optimization
    const optimizer = new AllocationOptimizer(teamMembers, roadmapItems);
    const report = optimizer.optimize();

    res.json(report);
  } catch (error) {
    console.error('Optimization error:', error);
    res.status(500).json({ error: 'Failed to run optimization: ' + error.message });
  }
});

// Google Sheets integration endpoints
const googleSheetsService = new GoogleSheetsService();

// Validate Google Sheets URL and structure
app.post('/api/sheets/validate', async (req, res) => {
  try {
    const { sheetUrl, apiKey } = req.body;
    
    if (!sheetUrl) {
      return res.status(400).json({ error: 'Sheet URL is required' });
    }

    // Try to initialize with service account first, fallback to API key
    if (process.env.SERVICE_ACCOUNT_PATH && fs.existsSync(process.env.SERVICE_ACCOUNT_PATH)) {
      await googleSheetsService.initWithServiceAccountFile(process.env.SERVICE_ACCOUNT_PATH);
    } else if (apiKey) {
      googleSheetsService.initWithApiKey(apiKey);
    } else {
      return res.status(400).json({ error: 'Google Sheets API key is required (service account not configured)' });
    }

    // Validate sheet structure
    const validation = await googleSheetsService.validateSheetStructure(sheetUrl);
    
    // Get metadata
    const metadata = await googleSheetsService.getSheetMetadata(sheetUrl);

    res.json({
      valid: validation.valid,
      metadata: metadata,
      structure: validation,
      message: validation.valid ? 'Sheet is ready for import!' : 'Sheet structure needs attention'
    });

  } catch (error) {
    console.error('Sheet validation error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Import team members from Google Sheets
app.post('/api/sheets/import', async (req, res) => {
  try {
    const { sheetUrl, apiKey, range = 'A1:G100', replaceExisting = false } = req.body;
    
    if (!sheetUrl) {
      return res.status(400).json({ error: 'Sheet URL is required' });
    }

    // Try to initialize with service account first, fallback to API key
    if (process.env.SERVICE_ACCOUNT_PATH && fs.existsSync(process.env.SERVICE_ACCOUNT_PATH)) {
      await googleSheetsService.initWithServiceAccountFile(process.env.SERVICE_ACCOUNT_PATH);
    } else if (apiKey) {
      googleSheetsService.initWithApiKey(apiKey);
    } else {
      return res.status(400).json({ error: 'Google Sheets API key is required (service account not configured)' });
    }

    // Import team members from sheet
    const importedMembers = await googleSheetsService.getTeamMembersFromSheet(sheetUrl, range);

    if (importedMembers.length === 0) {
      return res.status(400).json({ error: 'No valid team members found in the sheet' });
    }

    // Get existing team members
    let existingMembers = readDataFile(TEAM_MEMBERS_FILE);

    if (replaceExisting) {
      // Replace all existing members
      existingMembers = importedMembers;
    } else {
      // Add to existing members (avoiding duplicates by name)
      const existingNames = new Set(existingMembers.map(m => m.name.toLowerCase()));
      const newMembers = importedMembers.filter(m => !existingNames.has(m.name.toLowerCase()));
      existingMembers = [...existingMembers, ...newMembers];
    }

    // Save to file
    if (!writeDataFile(TEAM_MEMBERS_FILE, existingMembers)) {
      return res.status(500).json({ error: 'Failed to save imported team members' });
    }

    res.json({
      success: true,
      imported: importedMembers.length,
      total: existingMembers.length,
      members: importedMembers,
      message: `Successfully imported ${importedMembers.length} team member(s)`
    });

  } catch (error) {
    console.error('Sheet import error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get sample sheet template
app.get('/api/sheets/template', (req, res) => {
  const template = {
    headers: [
      'First name',
      'Last name',
      'Team name',
      'Level',
      'Location',
      'Career goals',
      'Notes'
    ],
    sampleData: [
      [
        'Alice',
        'Johnson',
        'Frontend Engineering',
        'Senior',
        'San Francisco',
        'Leadership, Mentoring, Architecture',
        'Team lead with 5+ years experience'
      ],
      [
        'Bob',
        'Smith',
        'Backend Engineering', 
        'Mid',
        'New York',
        'Architecture, Cloud Technologies, System Design',
        'Backend specialist, strong in distributed systems'
      ],
      [
        'Carol',
        'Davis',
        'Product Design',
        'Junior',
        'Austin',
        'Technical Growth, User Research, Accessibility',
        'Recent graduate, eager to learn and grow'
      ]
    ],
    instructions: [
      '1. Copy the headers to row 1 of your Google Sheet',
      '2. Add your team members\' data starting from row 2',
      '3. Career goals should be comma-separated',
      '4. Level can be: Intern, Junior, Mid, Senior, Staff, Principal, Architect',
      '5. Location can be city, office, or region',
      '6. Make sure your sheet is publicly readable or share it with the service account'
    ]
  };
  
  res.json(template);
});

// List Google Sheets from Drive
app.get('/api/sheets/list', async (req, res) => {
  try {
    // Initialize with service account
    if (process.env.SERVICE_ACCOUNT_PATH && fs.existsSync(process.env.SERVICE_ACCOUNT_PATH)) {
      await googleSheetsService.initWithServiceAccountFile(process.env.SERVICE_ACCOUNT_PATH);
    } else {
      return res.status(400).json({ error: 'Service account not configured for sheet listing' });
    }

    const sheets = await googleSheetsService.listGoogleSheets(null, 20);
    
    res.json({
      sheets: sheets,
      total: sheets.length
    });

  } catch (error) {
    console.error('Sheet listing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List Google Sheets from specific folder
app.get('/api/sheets/folder/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    
    // Initialize with service account
    if (process.env.SERVICE_ACCOUNT_PATH && fs.existsSync(process.env.SERVICE_ACCOUNT_PATH)) {
      await googleSheetsService.initWithServiceAccountFile(process.env.SERVICE_ACCOUNT_PATH);
    } else {
      return res.status(400).json({ error: 'Service account not configured for sheet listing' });
    }

    const sheets = await googleSheetsService.getSheetsFromFolder(folderId);
    
    res.json({
      sheets: sheets,
      total: sheets.length,
      folderId: folderId
    });

  } catch (error) {
    console.error('Folder sheet listing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search Google Sheets
app.post('/api/sheets/search', async (req, res) => {
  try {
    const { searchTerm } = req.body;
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.status(400).json({ error: 'Search term must be at least 2 characters long' });
    }

    // Initialize with service account
    if (process.env.SERVICE_ACCOUNT_PATH && fs.existsSync(process.env.SERVICE_ACCOUNT_PATH)) {
      await googleSheetsService.initWithServiceAccountFile(process.env.SERVICE_ACCOUNT_PATH);
    } else {
      return res.status(400).json({ error: 'Service account not configured for search' });
    }

    const sheets = await googleSheetsService.searchGoogleSheets(searchTerm.trim());
    
    res.json({
      sheets: sheets,
      total: sheets.length,
      searchTerm: searchTerm.trim()
    });

  } catch (error) {
    console.error('Sheet search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validate Google Sheets URL and structure for roadmap items
app.post('/api/sheets/validate-roadmap', async (req, res) => {
  try {
    const { sheetUrl, apiKey } = req.body;
    
    if (!sheetUrl) {
      return res.status(400).json({ error: 'Sheet URL is required' });
    }

    // Try to initialize with service account first, fallback to API key
    if (process.env.SERVICE_ACCOUNT_PATH && fs.existsSync(process.env.SERVICE_ACCOUNT_PATH)) {
      await googleSheetsService.initWithServiceAccountFile(process.env.SERVICE_ACCOUNT_PATH);
    } else if (apiKey) {
      googleSheetsService.initWithApiKey(apiKey);
    } else {
      return res.status(400).json({ error: 'Google Sheets API key is required (service account not configured)' });
    }

    // Validate sheet structure for roadmap items
    const validation = await googleSheetsService.validateRoadmapSheetStructure(sheetUrl);
    
    // Get metadata
    const metadata = await googleSheetsService.getSheetMetadata(sheetUrl);

    res.json({
      valid: validation.valid,
      metadata: metadata,
      structure: validation,
      message: validation.valid ? 'Sheet is ready for import!' : 'Sheet structure needs attention'
    });

  } catch (error) {
    console.error('Roadmap sheet validation error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Import roadmap items from Google Sheets
app.post('/api/sheets/import-roadmap', async (req, res) => {
  try {
    const { sheetUrl, apiKey, range = 'A1:H100', replaceExisting = false } = req.body;
    
    if (!sheetUrl) {
      return res.status(400).json({ error: 'Sheet URL is required' });
    }

    // Try to initialize with service account first, fallback to API key
    if (process.env.SERVICE_ACCOUNT_PATH && fs.existsSync(process.env.SERVICE_ACCOUNT_PATH)) {
      await googleSheetsService.initWithServiceAccountFile(process.env.SERVICE_ACCOUNT_PATH);
    } else if (apiKey) {
      googleSheetsService.initWithApiKey(apiKey);
    } else {
      return res.status(400).json({ error: 'Google Sheets API key is required (service account not configured)' });
    }

    // Import roadmap items from sheet
    const importedItems = await googleSheetsService.getRoadmapItemsFromSheet(sheetUrl, range);

    if (importedItems.length === 0) {
      return res.status(400).json({ error: 'No valid roadmap items found in the sheet' });
    }

    // Get existing roadmap items
    let existingItems = readDataFile(ROADMAP_ITEMS_FILE);

    if (replaceExisting) {
      // Replace all existing items
      existingItems = importedItems;
    } else {
      // Add to existing items (avoiding duplicates by name)
      const existingNames = new Set(existingItems.map(i => i.name.toLowerCase()));
      const newItems = importedItems.filter(i => !existingNames.has(i.name.toLowerCase()));
      existingItems = [...existingItems, ...newItems];
    }

    // Save to file
    if (!writeDataFile(ROADMAP_ITEMS_FILE, existingItems)) {
      return res.status(500).json({ error: 'Failed to save imported roadmap items' });
    }

    res.json({
      success: true,
      imported: importedItems.length,
      total: existingItems.length,
      items: importedItems,
      message: `Successfully imported ${importedItems.length} roadmap item(s)`
    });

  } catch (error) {
    console.error('Roadmap sheet import error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Check authentication methods available
app.get('/api/sheets/auth-status', (req, res) => {
  const serviceAccountAvailable = process.env.SERVICE_ACCOUNT_PATH && fs.existsSync(process.env.SERVICE_ACCOUNT_PATH);
  
  res.json({
    serviceAccountAvailable: serviceAccountAvailable,
    serviceAccountConfigured: serviceAccountAvailable,
    requiresApiKey: !serviceAccountAvailable
  });
});

// Environment info endpoint (for debugging) - sanitized for security
app.get('/api/env', (req, res) => {
  res.json({
    driveFolderConfigured: !!process.env.DRIVE_FOLDER_ID,
    serviceAccountConfigured: !!process.env.SERVICE_ACCOUNT_PATH,
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// Debug endpoint for file paths and existence (for Vercel troubleshooting)
app.get('/api/debug', (req, res) => {
  const debug = {
    cwd: process.cwd(),
    dirname: __dirname,
    projectRoot: projectRoot,
    teamMembersFile: TEAM_MEMBERS_FILE,
    roadmapItemsFile: ROADMAP_ITEMS_FILE,
    files: {
      teamMembersExists: fs.existsSync(TEAM_MEMBERS_FILE),
      roadmapItemsExists: fs.existsSync(ROADMAP_ITEMS_FILE)
    },
    teamMembersCount: readDataFile(TEAM_MEMBERS_FILE).length,
    roadmapItemsCount: readDataFile(ROADMAP_ITEMS_FILE).length
  };
  
  console.log('Debug info:', debug);
  res.json(debug);
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Team Allocation Optimizer Web UI running at http://localhost:${PORT}`);
  console.log(`📱 Open your browser and navigate to the URL above to get started!`);
});