import request from 'supertest';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { TeamMember, RoadmapItem } from '../src/models.js';
import { AllocationOptimizer } from '../src/optimizer.js';

// Mock file system operations for testing
let mockTeamMembers = [];
let mockRoadmapItems = [];

const initialTeamMember = {
  id: '1',
  name: 'Alice Smith',
  level: 'Senior',
  skills: ['JavaScript', 'React'],
  capacity: 1.0,
  interests: ['Frontend'],
  careerGoals: ['Leadership'],
  dateAdded: '2024-01-01T00:00:00.000Z'
};

const initialRoadmapItem = {
  id: '1',
  name: 'Frontend Redesign',
  description: 'Redesign the main UI',
  size: 3,
  complexity: 3,
  requiredSkills: ['React', 'CSS'],
  domain: 'Frontend',
  minLevel: 'Mid',
  careerOpportunities: ['UI/UX'],
  dateAdded: '2024-01-01T00:00:00.000Z'
};

// Create a test app
function createTestApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Mock data files
  const TEAM_MEMBERS_FILE = 'test-team-members.json';
  const ROADMAP_ITEMS_FILE = 'test-roadmap-items.json';

  // Helper functions (simplified for testing)
  function readDataFile(filename) {
    if (filename === TEAM_MEMBERS_FILE) {
      return mockTeamMembers;
    } else if (filename === ROADMAP_ITEMS_FILE) {
      return mockRoadmapItems;
    }
    return [];
  }

  function writeDataFile(filename, data) {
    // In real tests, you might want to actually write to temporary files
    // For now, we'll just simulate success
    return true;
  }

  // API Routes
  app.get('/api/team-members', (req, res) => {
    const teamMembers = readDataFile(TEAM_MEMBERS_FILE);
    res.json(teamMembers);
  });

  app.post('/api/team-members', (req, res) => {
    const { name, level, skills, capacity, interests, careerGoals } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

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

    mockTeamMembers.push(newMember);
    res.status(201).json(newMember);
  });

  app.delete('/api/team-members/:id', (req, res) => {
    const { id } = req.params;
    const index = mockTeamMembers.findIndex(member => member.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    mockTeamMembers.splice(index, 1);
    res.json({ message: 'Team member deleted successfully' });
  });

  app.get('/api/roadmap-items', (req, res) => {
    const roadmapItems = readDataFile(ROADMAP_ITEMS_FILE);
    res.json(roadmapItems);
  });

  app.post('/api/roadmap-items', (req, res) => {
    const { name, description, size, complexity, requiredSkills, domain, minLevel, careerOpportunities } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

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

    mockRoadmapItems.push(newItem);
    res.status(201).json(newItem);
  });

  app.delete('/api/roadmap-items/:id', (req, res) => {
    const { id } = req.params;
    const index = mockRoadmapItems.findIndex(item => item.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Roadmap item not found' });
    }

    mockRoadmapItems.splice(index, 1);
    res.json({ message: 'Roadmap item deleted successfully' });
  });

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
      res.status(500).json({ error: 'Failed to run optimization: ' + error.message });
    }
  });

  return app;
}

describe('API Endpoints', () => {
  let app;

  beforeEach(() => {
    // Reset mock data to initial state
    mockTeamMembers = [{ ...initialTeamMember }];
    mockRoadmapItems = [{ ...initialRoadmapItem }];
    app = createTestApp();
  });

  describe('GET /api/team-members', () => {
    it('should return team members', async () => {
      const response = await request(app)
        .get('/api/team-members')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('name', 'Alice Smith');
    });
  });

  describe('POST /api/team-members', () => {
    it('should create a new team member', async () => {
      const newMember = {
        name: 'Bob Johnson',
        level: 'Mid',
        skills: ['Python', 'Django'],
        capacity: 0.8,
        interests: ['Backend'],
        careerGoals: ['Architecture']
      };

      const response = await request(app)
        .post('/api/team-members')
        .send(newMember)
        .expect(201);

      expect(response.body).toHaveProperty('name', 'Bob Johnson');
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('dateAdded');
    });

    it('should require name field', async () => {
      const invalidMember = {
        level: 'Mid',
        skills: ['Python']
      };

      const response = await request(app)
        .post('/api/team-members')
        .send(invalidMember)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Name is required');
    });

    it('should handle missing optional fields', async () => {
      const minimalMember = {
        name: 'Minimal Member'
      };

      const response = await request(app)
        .post('/api/team-members')
        .send(minimalMember)
        .expect(201);

      expect(response.body.level).toBe('Mid'); // Default
      expect(response.body.capacity).toBe(1.0); // Default
      expect(response.body.skills).toEqual([]);
    });
  });

  describe('DELETE /api/team-members/:id', () => {
    it('should delete an existing team member', async () => {
      const response = await request(app)
        .delete('/api/team-members/1')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Team member deleted successfully');
    });

    it('should return 404 for non-existent member', async () => {
      const response = await request(app)
        .delete('/api/team-members/999')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Team member not found');
    });
  });

  describe('GET /api/roadmap-items', () => {
    it('should return roadmap items', async () => {
      const response = await request(app)
        .get('/api/roadmap-items')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('name', 'Frontend Redesign');
    });
  });

  describe('POST /api/roadmap-items', () => {
    it('should create a new roadmap item', async () => {
      const newItem = {
        name: 'API Development',
        description: 'Build REST APIs',
        size: 4,
        complexity: 3,
        requiredSkills: ['Node.js', 'Express'],
        domain: 'Backend',
        minLevel: 'Senior',
        careerOpportunities: ['Architecture']
      };

      const response = await request(app)
        .post('/api/roadmap-items')
        .send(newItem)
        .expect(201);

      expect(response.body).toHaveProperty('name', 'API Development');
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('dateAdded');
    });

    it('should require name field', async () => {
      const invalidItem = {
        size: 3,
        complexity: 2
      };

      const response = await request(app)
        .post('/api/roadmap-items')
        .send(invalidItem)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Name is required');
    });
  });

  describe('POST /api/optimize', () => {
    it('should run optimization successfully', async () => {
      const response = await request(app)
        .post('/api/optimize')
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('allocations');
      expect(response.body).toHaveProperty('teamMembers');
      expect(response.body).toHaveProperty('roadmapItems');
      expect(response.body).toHaveProperty('recommendations');

      expect(Array.isArray(response.body.allocations)).toBe(true);
      expect(Array.isArray(response.body.recommendations)).toBe(true);
    });

    it('should handle empty team members', async () => {
      mockTeamMembers.length = 0; // Clear all members

      const response = await request(app)
        .post('/api/optimize')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'No team members found. Please add team members first.');
    });

    it('should handle empty roadmap items', async () => {
      mockRoadmapItems.length = 0; // Clear all items

      const response = await request(app)
        .post('/api/optimize')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'No roadmap items found. Please add roadmap items first.');
    });
  });
});