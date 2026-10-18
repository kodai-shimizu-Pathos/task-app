import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReviewView } from './review-view';

describe('ReviewView', () => {
  let component: ReviewView;
  let fixture: ComponentFixture<ReviewView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReviewView);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
