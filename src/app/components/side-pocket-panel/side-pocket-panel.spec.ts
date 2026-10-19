import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidePocketPanelComponent } from './side-pocket-panel';

describe('SidePocketPanel', () => {
  let component: SidePocketPanelComponent;
  let fixture: ComponentFixture<SidePocketPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidePocketPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidePocketPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
