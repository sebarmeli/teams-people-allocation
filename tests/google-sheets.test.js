import { GoogleSheetsService } from '../src/web/google-sheets-service.js';

describe('GoogleSheetsService', () => {
  let service;

  beforeEach(() => {
    service = new GoogleSheetsService();
  });

  describe('extractSheetId', () => {
    it('should extract sheet ID from valid Google Sheets URL', () => {
      const url = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';
      const sheetId = service.extractSheetId(url);
      expect(sheetId).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
    });

    it('should extract sheet ID from URL without edit fragment', () => {
      const url = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
      const sheetId = service.extractSheetId(url);
      expect(sheetId).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
    });

    it('should throw error for invalid URL', () => {
      const invalidUrl = 'https://example.com/not-a-sheet';
      expect(() => service.extractSheetId(invalidUrl)).toThrow('Invalid Google Sheets URL');
    });
  });

  describe('parseTeamMemberRow', () => {
    it('should parse a complete team member row', () => {
      const headers = ['first name', 'last name', 'level', 'team name', 'location', 'career goals', 'notes'];
      const row = ['Alice', 'Johnson', 'Senior', 'Frontend', 'New York', 'Leadership', 'Great developer'];

      const member = service.parseTeamMemberRow(headers, row);

      expect(member).toEqual({
        id: expect.any(String),
        name: 'Alice Johnson',
        level: 'Senior',
        skills: [],
        capacity: 1.0,
        interests: ['Frontend'],
        careerGoals: ['Leadership'],
        teamName: 'Frontend',
        location: 'New York',
        notes: 'Great developer',
        dateAdded: expect.any(String),
        importedFrom: 'google-sheets'
      });
    });

    it('should handle missing optional fields', () => {
      const headers = ['first name'];
      const row = ['Bob'];

      const member = service.parseTeamMemberRow(headers, row);

      expect(member).toEqual({
        id: expect.any(String),
        name: 'Bob',
        level: 'Mid', // Default
        skills: [],
        capacity: 1.0, // Default
        interests: [],
        careerGoals: [],
        teamName: "",
        location: "",
        notes: "",
        dateAdded: expect.any(String),
        importedFrom: 'google-sheets'
      });
    });

    it('should handle different header variations', () => {
      const headers = ['first name', 'last name', 'experience level', 'location'];
      const row = ['Carol', 'Davis', 'Junior', 'San Francisco'];

      const member = service.parseTeamMemberRow(headers, row);

      expect(member.name).toBe('Carol Davis');
      expect(member.level).toBe('Junior');
      expect(member.skills).toEqual([]);
      expect(member.capacity).toBe(1.0);
      expect(member.location).toBe('San Francisco');
    });

    it('should return null for rows without names', () => {
      const headers = ['first name', 'last name', 'level'];
      const row = ['', '', 'Senior']; // Empty names

      const member = service.parseTeamMemberRow(headers, row);

      expect(member).toBeNull();
    });

    it('should handle capacity edge cases', () => {
      const headers = ['first name'];
      
      // All rows should have default capacity since the new implementation doesn't parse capacity
      const testRow = ['Test User'];
      const member = service.parseTeamMemberRow(headers, testRow);
      expect(member.capacity).toBe(1.0); // Default capacity
    });

    it('should parse comma-separated arrays correctly', () => {
      const headers = ['first name', 'team name', 'career goals'];
      const row = ['Test User', 'Full-stack', 'Leadership, Mentoring, Architecture'];

      const member = service.parseTeamMemberRow(headers, row);

      expect(member.skills).toEqual([]); // Skills not in new format
      expect(member.interests).toEqual(['Full-stack']); // Team name becomes interest
      expect(member.careerGoals).toEqual(['Leadership', 'Mentoring', 'Architecture']);
    });

    it('should handle empty and whitespace-only values', () => {
      const headers = ['first name', 'team name', 'career goals'];
      const row = ['Test User', '   Frontend  ', '   Leadership  ,  ,  Mentoring  '];

      const member = service.parseTeamMemberRow(headers, row);

      expect(member.skills).toEqual([]); // Skills not in new format  
      expect(member.interests).toEqual(['Frontend']); // Trimmed team name
      expect(member.careerGoals).toEqual(['Leadership', 'Mentoring']); // Empty strings filtered out
    });
  });

  describe('initialization', () => {
    it('should initialize with API key', () => {
      const apiKey = 'test-api-key';
      service.initWithApiKey(apiKey);

      expect(service.auth).toBe(apiKey);
      expect(service.sheets).toBeDefined();
    });

    it('should throw error for invalid service account credentials', async () => {
      const invalidCredentials = 'invalid-json';

      await expect(service.initWithServiceAccount(invalidCredentials))
        .rejects.toThrow('Failed to initialize Google Sheets auth');
    });
  });
});