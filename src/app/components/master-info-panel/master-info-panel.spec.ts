import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterInfoPanel } from './master-info-panel';

describe('MasterInfoPanel', () => {
  let component: MasterInfoPanel;
  let fixture: ComponentFixture<MasterInfoPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterInfoPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasterInfoPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
