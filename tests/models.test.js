import { TeamMember, RoadmapItem, Allocation } from '../src/models.js';

describe('TeamMember', () => {
  let member;

  beforeEach(() => {
    member = new TeamMember('John Doe', 'Senior', ['JavaScript', 'React'], 0.8, ['Frontend'], ['Leadership']);
  });

  it('should create a team member with correct properties', () => {
    expect(member.name).toBe('John Doe');
    expect(member.level).toBe('Senior');
    expect(member.skills).toEqual(['JavaScript', 'React']);
    expect(member.capacity).toBe(0.8);
    expect(member.interests).toEqual(['Frontend']);
    expect(member.careerGoals).toEqual(['Leadership']);
    expect(member.allocatedCapacity).toBe(0.0);
  });

  it('should calculate available capacity correctly', () => {
    expect(member.getAvailableCapacity()).toBe(0.8);
    
    member.allocatedCapacity = 0.3;
    expect(member.getAvailableCapacity()).toBe(0.5);
    
    member.allocatedCapacity = 0.8;
    expect(member.getAvailableCapacity()).toBe(0.0);
    
    member.allocatedCapacity = 1.0;
    expect(member.getAvailableCapacity()).toBe(0.0); // Should not go negative
  });

  it('should check skills correctly', () => {
    expect(member.hasSkill('JavaScript')).toBe(true);
    expect(member.hasSkill('React')).toBe(true);
    expect(member.hasSkill('Python')).toBe(false);
    expect(member.hasSkill('java')).toBe(true); // Case insensitive partial match
  });

  it('should check interests correctly', () => {
    expect(member.hasInterest('Frontend')).toBe(true);
    expect(member.hasInterest('Backend')).toBe(false);
    expect(member.hasInterest('front')).toBe(true); // Case insensitive partial match
  });

  it('should check career goals correctly', () => {
    expect(member.hasCareerGoal('Leadership')).toBe(true);
    expect(member.hasCareerGoal('Architecture')).toBe(false);
    expect(member.hasCareerGoal('lead')).toBe(true); // Case insensitive partial match
  });

  it('should return correct level weight', () => {
    expect(member.getLevelWeight()).toBe(1.3); // Senior level

    const juniorMember = new TeamMember('Junior Dev', 'Junior');
    expect(juniorMember.getLevelWeight()).toBe(0.7);

    const unknownMember = new TeamMember('Unknown Dev', 'Unknown Level');
    expect(unknownMember.getLevelWeight()).toBe(1.0); // Default
  });
});

describe('RoadmapItem', () => {
  let item;

  beforeEach(() => {
    item = new RoadmapItem(
      'Frontend Redesign',
      'Redesign the main UI',
      4,
      3,
      ['React', 'CSS'],
      'Frontend',
      'Mid',
      ['UI/UX', 'Leadership']
    );
  });

  it('should create a roadmap item with correct properties', () => {
    expect(item.name).toBe('Frontend Redesign');
    expect(item.description).toBe('Redesign the main UI');
    expect(item.size).toBe(4);
    expect(item.complexity).toBe(3);
    expect(item.requiredSkills).toEqual(['React', 'CSS']);
    expect(item.domain).toBe('Frontend');
    expect(item.minLevel).toBe('Mid');
    expect(item.careerOpportunities).toEqual(['UI/UX', 'Leadership']);
    expect(item.assignedMembers).toEqual([]);
  });

  it('should calculate priority correctly', () => {
    expect(item.priority).toBe(4 * 0.6 + 3 * 0.4); // 2.4 + 1.2 = 3.6
  });

  it('should calculate required capacity', () => {
    const capacity = item.getRequiredCapacity();
    expect(capacity).toBe((4/5) * (3/5) * 2); // 0.8 * 0.6 * 2 = 0.96
  });

  it('should track total allocation', () => {
    expect(item.getTotalAllocation()).toBe(0);

    item.assignedMembers.push({ member: 'John', allocation: 0.3 });
    item.assignedMembers.push({ member: 'Jane', allocation: 0.2 });

    expect(item.getTotalAllocation()).toBe(0.5);
  });

  it('should determine if fully staffed', () => {
    expect(item.isFullyStaffed()).toBe(false);

    // Add enough allocation to meet requirement
    const requiredCapacity = item.getRequiredCapacity();
    item.assignedMembers.push({ member: 'John', allocation: requiredCapacity });

    expect(item.isFullyStaffed()).toBe(true);
  });
});

describe('Allocation', () => {
  let member;
  let item;
  let allocation;

  beforeEach(() => {
    member = new TeamMember('Alice', 'Senior', ['React', 'JavaScript'], 1.0, ['Frontend'], ['Leadership']);
    item = new RoadmapItem('React Project', 'Build React app', 3, 3, ['React'], 'Frontend', 'Mid', ['Leadership']);
    allocation = new Allocation(member, item, 0.4);
  });

  it('should create allocation with correct properties', () => {
    expect(allocation.member).toBe(member);
    expect(allocation.item).toBe(item);
    expect(allocation.allocation).toBe(0.4);
    expect(typeof allocation.score).toBe('number');
  });

  it('should calculate score based on skill match', () => {
    // High skill match (React matches)
    const highSkillScore = allocation.score;

    // Low skill match
    const lowSkillMember = new TeamMember('Bob', 'Senior', ['Python'], 1.0);
    const lowSkillAllocation = new Allocation(lowSkillMember, item, 0.4);
    const lowSkillScore = lowSkillAllocation.score;

    expect(highSkillScore).toBeGreaterThan(lowSkillScore);
  });

  it('should include interest bonus in score', () => {
    // Member with matching interest
    const interestedScore = allocation.score;

    // Member without matching interest  
    const uninterestedMember = new TeamMember('Charlie', 'Senior', ['React'], 1.0, ['Backend']);
    const uninterestedAllocation = new Allocation(uninterestedMember, item, 0.4);
    const uninterestedScore = uninterestedAllocation.score;

    expect(interestedScore).toBeGreaterThan(uninterestedScore);
  });

  it('should include career goal bonus in score', () => {
    // Member with matching career goals
    const careerMatchScore = allocation.score;

    // Member without matching career goals
    const noCareerMember = new TeamMember('Dave', 'Senior', ['React'], 1.0, ['Frontend'], ['Architecture']);
    const noCareerAllocation = new Allocation(noCareerMember, item, 0.4);
    const noCareerScore = noCareerAllocation.score;

    expect(careerMatchScore).toBeGreaterThan(noCareerScore);
  });

  it('should penalize under-leveled assignments', () => {
    // Appropriate level
    const appropriateScore = allocation.score;

    // Under-leveled assignment
    const juniorMember = new TeamMember('Junior Dev', 'Junior', ['React'], 1.0, ['Frontend']);
    const underLeveledAllocation = new Allocation(juniorMember, item, 0.4);
    const underLeveledScore = underLeveledAllocation.score;

    expect(appropriateScore).toBeGreaterThan(underLeveledScore);
  });

  it('should give bonus for higher allocation percentage', () => {
    const lowAllocation = new Allocation(member, item, 0.1);
    const highAllocation = new Allocation(member, item, 0.8);

    expect(highAllocation.score).toBeGreaterThan(lowAllocation.score);
  });
});