import { TestBed } from '@angular/core/testing';

import { PipService } from './pip';

describe('Pip', () => {
  let service: PipService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PipService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
