import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DelayLogToast } from './delay-log-toast';

describe('DelayLogToast', () => {
  let component: DelayLogToast;
  let fixture: ComponentFixture<DelayLogToast>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DelayLogToast]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DelayLogToast);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
