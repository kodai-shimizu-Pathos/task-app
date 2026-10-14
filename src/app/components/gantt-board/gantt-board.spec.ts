import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GanttBoard } from './gantt-board';

describe('GanttBoard', () => {
  let component: GanttBoard;
  let fixture: ComponentFixture<GanttBoard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GanttBoard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GanttBoard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
