import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PipInboxComponent } from './pip-inbox';

describe('PipInbox', () => {
  let component: PipInboxComponent;
  let fixture: ComponentFixture<PipInboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PipInboxComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PipInboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
