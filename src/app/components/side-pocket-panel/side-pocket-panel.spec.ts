import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidePocketPanel } from './side-pocket-panel';

describe('SidePocketPanel', () => {
  let component: SidePocketPanel;
  let fixture: ComponentFixture<SidePocketPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidePocketPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidePocketPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
