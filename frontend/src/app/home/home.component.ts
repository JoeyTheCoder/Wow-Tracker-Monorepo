import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';

type Availability = 'available' | 'maybe' | 'unavailable';

interface PartyMember {
  character: string;
  level: number;
  color: string;
  isYou?: boolean;
  availability: Availability;
}

interface Dungeon {
  name: string;
  zone: string;
  minLevel: number;
  maxLevel: number;
  note?: string;
  progress: string;
  state: 'planned' | 'upcoming' | 'complete';
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  private readonly currentWeekStart = this.getCurrentWeekStart();
  weekOffset = 0;
  sessionDialogOpen = false;
  notice = '';
  plannedDungeonName = 'Ragefire Chasm';
  newSessionDate = this.toDateInputValue(this.upcomingDate);
  newSessionTime = '20:00';

  readonly dungeons: Dungeon[] = [
    { name: 'Ragefire Chasm', zone: 'Orgrimmar', minLevel: 13, maxLevel: 18, progress: 'Not started', state: 'planned' },
    { name: 'Wailing Caverns', zone: 'The Barrens', minLevel: 15, maxLevel: 25, progress: 'Upcoming', state: 'upcoming' },
    { name: 'Shadowfang Keep', zone: 'Silverpine Forest', minLevel: 22, maxLevel: 30, progress: 'Upcoming', state: 'upcoming' },
    { name: 'Blackfathom Deeps', zone: 'Ashenvale', minLevel: 24, maxLevel: 32, progress: 'Upcoming', state: 'upcoming' },
    { name: 'Scarlet Monastery — Graveyard', zone: 'Tirisfal Glades', minLevel: 26, maxLevel: 36, note: 'Run before Library', progress: 'Upcoming', state: 'upcoming' },
    { name: 'Gnomeregan', zone: 'Dun Morogh', minLevel: 29, maxLevel: 38, note: 'Long trip from Horde territory', progress: 'Upcoming', state: 'upcoming' },
    { name: 'Scarlet Monastery — Library', zone: 'Tirisfal Glades', minLevel: 29, maxLevel: 39, progress: 'Upcoming', state: 'upcoming' },
    { name: 'Razorfen Kraul', zone: 'The Barrens', minLevel: 30, maxLevel: 40, progress: 'Upcoming', state: 'upcoming' },
    { name: 'Scarlet Monastery — Armory', zone: 'Tirisfal Glades', minLevel: 32, maxLevel: 42, progress: 'Upcoming', state: 'upcoming' },
    { name: 'Scarlet Monastery — Cathedral', zone: 'Tirisfal Glades', minLevel: 35, maxLevel: 45, progress: 'Upcoming', state: 'upcoming' },
    { name: 'Razorfen Downs', zone: 'The Barrens', minLevel: 40, maxLevel: 50, progress: 'Upcoming', state: 'upcoming' },
    { name: 'Uldaman', zone: 'Badlands', minLevel: 42, maxLevel: 52, progress: 'Upcoming', state: 'upcoming' },
    { name: "Zul'Farrak", zone: 'Tanaris', minLevel: 44, maxLevel: 54, progress: 'Upcoming', state: 'upcoming' },
    { name: 'Maraudon', zone: 'Desolace', minLevel: 46, maxLevel: 55, progress: 'Upcoming', state: 'upcoming' },
    { name: "Temple of Atal'Hakkar", zone: 'Swamp of Sorrows', minLevel: 50, maxLevel: 60, progress: 'Upcoming', state: 'upcoming' },
    { name: 'Blackrock Depths', zone: 'Blackrock Mountain', minLevel: 52, maxLevel: 60, progress: 'Upcoming', state: 'upcoming' },
    { name: 'Lower Blackrock Spire', zone: 'Blackrock Mountain', minLevel: 55, maxLevel: 60, progress: 'Upcoming', state: 'upcoming' },
    { name: 'Upper Blackrock Spire', zone: 'Blackrock Mountain', minLevel: 55, maxLevel: 60, progress: 'Upcoming', state: 'upcoming' },
    { name: 'Dire Maul', zone: 'Feralas', minLevel: 58, maxLevel: 60, progress: 'Upcoming', state: 'upcoming' },
    { name: 'Scholomance', zone: 'Western Plaguelands', minLevel: 58, maxLevel: 60, progress: 'Upcoming', state: 'upcoming' },
    { name: 'Stratholme', zone: 'Eastern Plaguelands', minLevel: 58, maxLevel: 60, progress: 'Upcoming', state: 'upcoming' }
  ];

  readonly members: PartyMember[] = [
    { character: 'Malgus', level: 13, color: '#4f73e6', isYou: true, availability: 'available' },
    { character: 'Arielle', level: 16, color: '#9e77df', availability: 'available' },
    { character: 'Thorn', level: 14, color: '#d58956', availability: 'maybe' },
    { character: 'Brom', level: 17, color: '#72849d', availability: 'unavailable' }
  ];

  private readonly availabilityPattern = [2, 3, 2, 3, 4, 4, 2];

  get readyCount(): number {
    return this.members.filter((member) => member.level >= this.plannedDungeon.minLevel).length;
  }

  progressPercent(level: number): number {
    return Math.min(100, (level / this.plannedDungeon.minLevel) * 100);
  }

  get plannedDungeon(): Dungeon {
    return this.dungeons.find((dungeon) => dungeon.name === this.plannedDungeonName) ?? this.dungeons[0];
  }

  get myMember(): PartyMember {
    return this.members.find((member) => member.isYou)!;
  }

  get myAvailability(): Availability {
    return this.myMember.availability;
  }

  get weekLabel(): string {
    const start = new Date(this.currentWeekStart);
    start.setDate(start.getDate() + this.weekOffset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const month = new Intl.DateTimeFormat('en', { month: 'short' });
    return `${month.format(start)} ${start.getDate()} – ${month.format(end)} ${end.getDate()}`;
  }

  get weekDays(): { day: string; date: string; availability: string; isBest: boolean }[] {
    const start = new Date(this.currentWeekStart);
    start.setDate(start.getDate() + this.weekOffset * 7);
    return this.availabilityPattern.map((availableCount, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        day: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date),
        date: new Intl.DateTimeFormat('en', { day: 'numeric' }).format(date),
        availability: `${availableCount} free`,
        isBest: index === 5
      };
    });
  }

  get upcomingDate(): Date {
    const date = new Date(this.currentWeekStart);
    date.setDate(date.getDate() + 5 + this.weekOffset * 7);
    date.setHours(20, 0, 0, 0);
    return date;
  }

  private getCurrentWeekStart(): Date {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return date;
  }

  private toDateInputValue(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  shiftWeek(amount: number): void {
    this.weekOffset += amount;
    this.newSessionDate = this.toDateInputValue(this.upcomingDate);
  }

  toggleAvailability(member: PartyMember): void {
    if (!member.isYou) return;
    const states: Availability[] = ['available', 'maybe', 'unavailable'];
    member.availability = states[(states.indexOf(member.availability) + 1) % states.length];
    this.showNotice(`Your availability is now ${member.availability}.`);
  }

  planDungeon(dungeon: Dungeon): void {
    if (dungeon.state === 'complete') {
      this.showNotice(`${dungeon.name} is already marked complete by the group.`);
      return;
    }
    this.plannedDungeonName = dungeon.name;
    this.showNotice(`${dungeon.name} is now your next planned dungeon.`);
  }

  createSession(dateValue: string, timeValue: string): void {
    if (!dateValue || !timeValue) return;
    this.sessionDialogOpen = false;
    const date = new Date(`${dateValue}T${timeValue}`);
    this.showNotice(`Session idea saved for ${date.toLocaleString([], { weekday: 'long', hour: 'numeric', minute: '2-digit' })}.`);
  }

  showNotice(message: string): void {
    this.notice = message;
    window.setTimeout(() => {
      if (this.notice === message) this.notice = '';
    }, 3200);
  }
}
