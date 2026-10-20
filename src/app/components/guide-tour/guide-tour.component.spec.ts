import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GuideTourComponent } from './guide-tour.component';

describe('GuideTourComponent', () => {
  let component: GuideTourComponent;
  let fixture: ComponentFixture<GuideTourComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuideTourComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GuideTourComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have 4 steps', () => {
    expect(component.steps.length).toBe(4);
  });

  it('should initialize with first step', () => {
    expect(component.currentStepIndex).toBe(0);
    expect(component.currentStepNumber).toBe(1);
  });

  it('should go to next step', () => {
    component.currentStepIndex = 0;
    component.goToNextStep();
    expect(component.currentStepIndex).toBe(1);
  });

  it('should go to previous step', () => {
    component.currentStepIndex = 2;
    component.goToPreviousStep();
    expect(component.currentStepIndex).toBe(1);
  });

  it('should not go before first step', () => {
    component.currentStepIndex = 0;
    component.goToPreviousStep();
    expect(component.currentStepIndex).toBe(0);
  });

  it('should recognize last step', () => {
    component.currentStepIndex = component.steps.length - 1;
    expect(component.isLastStep).toBeTruthy();
  });

  it('should emit closeRequested when closing', () => {
    spyOn(component.closeRequested, 'emit');
    component.closeTour();
    expect(component.closeRequested.emit).toHaveBeenCalled();
  });
});
