import { AllocationOptimizer } from '../src/optimizer.js';
import { TeamMember, RoadmapItem } from '../src/models.js';

describe('AllocationOptimizer', () => {
  let teamMembers;
  let roadmapItems;
  let optimizer;

  beforeEach(() => {
    // Create test team members
    teamMembers = [
      new TeamMember('Alice', 'Senior', ['JavaScript', 'React'], 1.0, ['Frontend'], ['Leadership']),
      new TeamMember('Bob', 'Mid', ['Node.js', 'Python'], 0.8, ['Backend'], ['Architecture']),
      new TeamMember('Carol', 'Junior', ['CSS', 'HTML'], 1.0, ['Frontend'], ['Mentoring'])
    ];

    // Create test roadmap items
    roadmapItems = [
      new RoadmapItem('Frontend Redesign', 'Redesign the main UI', 4, 3, ['React', 'CSS'], 'Frontend', 'Mid', ['Leadership']),
      new RoadmapItem('API Development', 'Build REST APIs', 3, 4, ['Node.js', 'Python'], 'Backend', 'Senior', ['Architecture']),
      new RoadmapItem('Small Bug Fix', 'Fix minor issues', 1, 1, ['JavaScript'], 'Frontend', 'Junior', [])
    ];

    optimizer = new AllocationOptimizer(teamMembers, roadmapItems);
  });

  describe('constructor', () => {
    it('should initialize with team members and roadmap items', () => {
      expect(optimizer.teamMembers).toEqual(teamMembers);
      expect(optimizer.roadmapItems).toEqual(roadmapItems);
      expect(optimizer.allocations).toEqual([]);
    });
  });

  describe('optimize', () => {
    it('should return a valid report structure', () => {
      const report = optimizer.optimize();

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('allocations');
      expect(report).toHaveProperty('teamMembers');
      expect(report).toHaveProperty('roadmapItems');
      expect(report).toHaveProperty('itemsByStatus');
      expect(report).toHaveProperty('recommendations');
    });

    it('should calculate summary statistics correctly', () => {
      const report = optimizer.optimize();

      expect(report.summary.totalTeamCapacity).toBe(2.8); // 1.0 + 0.8 + 1.0
      expect(report.summary.itemsCount).toBe(3);
      expect(report.summary.totalAssignments).toBeGreaterThanOrEqual(0);
    });

    it('should create allocations array with correct structure', () => {
      const report = optimizer.optimize();

      expect(Array.isArray(report.allocations)).toBe(true);
      
      if (report.allocations.length > 0) {
        const allocation = report.allocations[0];
        expect(allocation).toHaveProperty('member');
        expect(allocation).toHaveProperty('item');
        expect(allocation).toHaveProperty('allocation');
        expect(allocation).toHaveProperty('score');
        expect(typeof allocation.member).toBe('string');
        expect(typeof allocation.item).toBe('string');
        expect(typeof allocation.allocation).toBe('number');
        expect(typeof allocation.score).toBe('number');
      }
    });

    it('should categorize items by status', () => {
      const report = optimizer.optimize();

      expect(report.itemsByStatus).toHaveProperty('fully-staffed');
      expect(report.itemsByStatus).toHaveProperty('adequately-staffed');
      expect(report.itemsByStatus).toHaveProperty('under-staffed');
      expect(report.itemsByStatus).toHaveProperty('not-staffed');

      const totalItems = 
        report.itemsByStatus['fully-staffed'].length +
        report.itemsByStatus['adequately-staffed'].length +
        report.itemsByStatus['under-staffed'].length +
        report.itemsByStatus['not-staffed'].length;

      expect(totalItems).toBe(roadmapItems.length);
    });

    it('should provide recommendations as an array of strings', () => {
      const report = optimizer.optimize();

      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.recommendations.length).toBeGreaterThan(0);
      
      report.recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
      });
    });

    it('should not exceed team member capacity', () => {
      const report = optimizer.optimize();

      report.teamMembers.forEach(member => {
        expect(member.allocatedCapacity).toBeLessThanOrEqual(member.capacity);
      });
    });

    it('should handle empty team members gracefully', () => {
      const emptyOptimizer = new AllocationOptimizer([], roadmapItems);
      const report = emptyOptimizer.optimize();

      expect(report.summary.totalTeamCapacity).toBe(0);
      expect(report.summary.totalAllocatedCapacity).toBe(0);
      expect(report.allocations).toEqual([]);
    });

    it('should handle empty roadmap items gracefully', () => {
      const emptyOptimizer = new AllocationOptimizer(teamMembers, []);
      const report = emptyOptimizer.optimize();

      expect(report.summary.itemsCount).toBe(0);
      expect(report.allocations).toEqual([]);
      // With team members but no roadmap items, should recommend available capacity
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('skill matching', () => {
    it('should prefer team members with matching skills', () => {
      // Create a specific scenario
      const frontendMember = new TeamMember('Frontend Dev', 'Senior', ['React', 'CSS'], 1.0, ['Frontend']);
      const backendMember = new TeamMember('Backend Dev', 'Senior', ['Node.js', 'Python'], 1.0, ['Backend']);
      
      const frontendProject = new RoadmapItem('React App', 'Build React app', 3, 3, ['React'], 'Frontend');
      
      const testOptimizer = new AllocationOptimizer([frontendMember, backendMember], [frontendProject]);
      const report = testOptimizer.optimize();

      // Frontend dev should be allocated to frontend project
      const frontendAllocation = report.allocations.find(a => a.member === 'Frontend Dev');
      expect(frontendAllocation).toBeDefined();
      if (frontendAllocation) {
        expect(frontendAllocation.item).toBe('React App');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle team members with zero capacity', () => {
      const zeroCapacityMember = new TeamMember('Zero Cap', 'Mid', ['JavaScript'], 0.0, ['Frontend']);
      const testOptimizer = new AllocationOptimizer([zeroCapacityMember], roadmapItems);
      
      const report = testOptimizer.optimize();
      expect(report.summary.totalTeamCapacity).toBe(0);
      expect(report.allocations).toEqual([]);
    });

    it('should handle very large capacity requirements', () => {
      const hugProject = new RoadmapItem('Huge Project', 'Massive undertaking', 5, 5, [], 'General');
      const testOptimizer = new AllocationOptimizer(teamMembers, [hugProject]);
      
      const report = testOptimizer.optimize();
      expect(report).toBeDefined();
      expect(typeof report.summary.totalAllocatedCapacity).toBe('number');
    });
  });
});