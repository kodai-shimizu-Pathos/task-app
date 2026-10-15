import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PipInbox } from './pip-inbox';

describe('PipInbox', () => {
  let component: PipInbox;
  let fixture: ComponentFixture<PipInbox>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PipInbox]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PipInbox);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
