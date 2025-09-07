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
      const headers = ['name', 'level', 'skills', 'capacity', 'interests', 'career goals'];
      const row = ['Alice Johnson', 'Senior', 'JavaScript, React', '1.0', 'Frontend', 'Leadership'];

      const member = service.parseTeamMemberRow(headers, row);

      expect(member).toEqual({
        id: expect.any(String),
        name: 'Alice Johnson',
        level: 'Senior',
        skills: ['JavaScript', 'React'],
        capacity: 1.0,
        interests: ['Frontend'],
        careerGoals: ['Leadership'],
        dateAdded: expect.any(String),
        importedFrom: 'google-sheets'
      });
    });

    it('should handle missing optional fields', () => {
      const headers = ['name'];
      const row = ['Bob Smith'];

      const member = service.parseTeamMemberRow(headers, row);

      expect(member).toEqual({
        id: expect.any(String),
        name: 'Bob Smith',
        level: 'Mid', // Default
        skills: [],
        capacity: 1.0, // Default
        interests: [],
        careerGoals: [],
        dateAdded: expect.any(String),
        importedFrom: 'google-sheets'
      });
    });

    it('should handle different header variations', () => {
      const headers = ['full name', 'experience level', 'technical skills', 'fte'];
      const row = ['Carol Davis', 'Junior', 'HTML, CSS', '0.8'];

      const member = service.parseTeamMemberRow(headers, row);

      expect(member.name).toBe('Carol Davis');
      expect(member.level).toBe('Junior');
      expect(member.skills).toEqual(['HTML', 'CSS']);
      expect(member.capacity).toBe(0.8);
    });

    it('should return null for rows without names', () => {
      const headers = ['name', 'level'];
      const row = ['', 'Senior']; // Empty name

      const member = service.parseTeamMemberRow(headers, row);

      expect(member).toBeNull();
    });

    it('should handle capacity edge cases', () => {
      const headers = ['name', 'capacity'];
      
      // Test invalid capacity values
      const invalidRow = ['Test User', 'invalid'];
      const member1 = service.parseTeamMemberRow(headers, invalidRow);
      expect(member1.capacity).toBe(1.0); // Default

      // Test boundary values
      const negativeRow = ['Test User', '-0.5'];
      const member2 = service.parseTeamMemberRow(headers, negativeRow);
      expect(member2.capacity).toBe(0); // Clamped to 0

      const highRow = ['Test User', '1.5'];
      const member3 = service.parseTeamMemberRow(headers, highRow);
      expect(member3.capacity).toBe(1); // Clamped to 1
    });

    it('should parse comma-separated arrays correctly', () => {
      const headers = ['name', 'skills', 'interests'];
      const row = ['Test User', 'JavaScript, React, Node.js', 'Frontend, Full-stack'];

      const member = service.parseTeamMemberRow(headers, row);

      expect(member.skills).toEqual(['JavaScript', 'React', 'Node.js']);
      expect(member.interests).toEqual(['Frontend', 'Full-stack']);
    });

    it('should handle empty and whitespace-only values', () => {
      const headers = ['name', 'skills', 'interests'];
      const row = ['Test User', '  , JavaScript,  , React,  ', '   Frontend  ,  ,  Backend  '];

      const member = service.parseTeamMemberRow(headers, row);

      expect(member.skills).toEqual(['JavaScript', 'React']); // Empty strings filtered out
      expect(member.interests).toEqual(['Frontend', 'Backend']); // Trimmed and filtered
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