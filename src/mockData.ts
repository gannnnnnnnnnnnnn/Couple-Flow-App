import type {
  Activity,
  BudgetGroup,
  DrawSession,
  Pair,
  PairMember,
  ScheduledSession,
  SessionOutcome,
  WeeklyActivityBan,
} from './types';

export const pair: Pair = {
  id: 'pair-001',
  name: 'G + L',
  timezone: 'Australia/Melbourne',
  created_at: '2026-06-01T00:00:00.000Z',
};

export const members: PairMember[] = [
  {
    id: 'member-g',
    pair_id: pair.id,
    display_name: 'G',
    color: '#f97362',
    created_at: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'member-l',
    pair_id: pair.id,
    display_name: 'L',
    color: '#7ad7bd',
    created_at: '2026-06-01T00:00:00.000Z',
  },
];

export const budgetGroups: BudgetGroup[] = [
  {
    id: 'budget-tiny',
    pair_id: pair.id,
    name: 'tiny',
    amount_hint: '$',
    sort_order: 1,
  },
  {
    id: 'budget-treat',
    pair_id: pair.id,
    name: 'treat',
    amount_hint: '$$',
    sort_order: 2,
  },
  {
    id: 'budget-splurge',
    pair_id: pair.id,
    name: 'splurge',
    amount_hint: '$$$',
    sort_order: 3,
  },
];

export const activities: Activity[] = [
  {
    id: 'activity-night-market',
    pair_id: pair.id,
    title: 'Night market snack crawl',
    note: 'Pick three stalls and share everything.',
    budget_group_id: 'budget-treat',
    duration_minutes: 120,
    tags: ['food', 'outside'],
    created_by_member_id: 'member-g',
    status: 'active',
    created_at: '2026-06-02T00:00:00.000Z',
  },
  {
    id: 'activity-home-ramen',
    pair_id: pair.id,
    title: 'Fancy ramen at home',
    note: 'Soft eggs, toppings, and a new broth.',
    budget_group_id: 'budget-tiny',
    duration_minutes: 75,
    tags: ['home', 'food'],
    created_by_member_id: 'member-l',
    status: 'active',
    created_at: '2026-06-03T00:00:00.000Z',
  },
  {
    id: 'activity-pottery',
    pair_id: pair.id,
    title: 'Pottery class trial',
    note: 'Book ahead if the draw lands here.',
    budget_group_id: 'budget-splurge',
    duration_minutes: 150,
    tags: ['creative', 'book ahead'],
    created_by_member_id: 'member-g',
    status: 'active',
    created_at: '2026-06-04T00:00:00.000Z',
  },
  {
    id: 'activity-sunrise',
    pair_id: pair.id,
    title: 'Sunrise pastry walk',
    note: 'Early walk, bakery stop, home before the day gets loud.',
    budget_group_id: 'budget-tiny',
    duration_minutes: 90,
    tags: ['morning', 'outside'],
    created_by_member_id: 'member-l',
    status: 'active',
    created_at: '2026-06-05T00:00:00.000Z',
  },
  {
    id: 'activity-arcade',
    pair_id: pair.id,
    title: 'Arcade duel night',
    note: 'Ten tokens each, winner chooses dessert.',
    budget_group_id: 'budget-treat',
    duration_minutes: 105,
    tags: ['games', 'inside'],
    created_by_member_id: 'member-g',
    status: 'active',
    created_at: '2026-06-07T00:00:00.000Z',
  },
  {
    id: 'activity-bookshop',
    pair_id: pair.id,
    title: 'Bookshop swap',
    note: 'Pick one tiny book for each other.',
    budget_group_id: 'budget-tiny',
    duration_minutes: 60,
    tags: ['quiet', 'inside'],
    created_by_member_id: 'member-l',
    status: 'active',
    created_at: '2026-06-08T00:00:00.000Z',
  },
  {
    id: 'activity-karaoke',
    pair_id: pair.id,
    title: 'Karaoke room',
    note: 'Paused until the next rainy week.',
    budget_group_id: 'budget-treat',
    duration_minutes: 120,
    tags: ['music', 'inside'],
    created_by_member_id: 'member-g',
    status: 'paused',
    created_at: '2026-06-06T00:00:00.000Z',
  },
];

export const drawSessions: DrawSession[] = [
  {
    id: 'draw-seed',
    pair_id: pair.id,
    target_week_start_date: '2026-07-06',
    created_by_member_id: 'member-g',
    status: 'draft',
    created_at: '2026-06-29T00:00:00.000Z',
  },
];

export const weeklyActivityBans: WeeklyActivityBan[] = [
  {
    id: 'ban-seed-g-karaoke',
    pair_id: pair.id,
    draw_session_id: 'draw-seed',
    member_id: 'member-g',
    activity_id: 'activity-karaoke',
    created_at: '2026-06-29T00:00:00.000Z',
  },
];

export const scheduledSessions: ScheduledSession[] = [
  {
    id: 'session-current',
    pair_id: pair.id,
    activity_id: 'activity-night-market',
    draw_session_id: null,
    target_week_start_date: '2026-06-29',
    status: 'ongoing',
    todo_text: 'Choose stalls before Thursday',
    created_at: '2026-06-22T00:00:00.000Z',
  },
  {
    id: 'session-future',
    pair_id: pair.id,
    activity_id: 'activity-home-ramen',
    draw_session_id: null,
    target_week_start_date: '2026-07-06',
    status: 'planning',
    todo_text: 'Buy toppings on Sunday',
    created_at: '2026-06-23T00:00:00.000Z',
  },
  {
    id: 'session-history',
    pair_id: pair.id,
    activity_id: 'activity-sunrise',
    draw_session_id: null,
    target_week_start_date: '2026-06-22',
    status: 'completed',
    todo_text: 'Try the almond croissant',
    created_at: '2026-06-16T00:00:00.000Z',
  },
  {
    id: 'session-missed',
    pair_id: pair.id,
    activity_id: 'activity-karaoke',
    draw_session_id: null,
    target_week_start_date: '2026-06-15',
    status: 'not_done',
    todo_text: 'Book two hours',
    created_at: '2026-06-09T00:00:00.000Z',
  },
];

export const sessionOutcomes: SessionOutcome[] = [
  {
    id: 'outcome-history',
    scheduled_session_id: 'session-history',
    outcome_type: 'completed',
    rating: '顶级',
    reason: null,
    replacement_activity_id: null,
    agreed_by_member_ids: [],
    created_at: '2026-06-28T09:00:00.000Z',
  },
  {
    id: 'outcome-missed',
    scheduled_session_id: 'session-missed',
    outcome_type: 'not_done',
    rating: null,
    reason: 'Both too tired after work.',
    replacement_activity_id: null,
    agreed_by_member_ids: [],
    created_at: '2026-06-21T09:00:00.000Z',
  },
];
