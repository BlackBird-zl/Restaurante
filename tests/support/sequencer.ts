import { BaseSequencer, type TestSpecification } from 'vitest/node';

/** Integration files run in name order: 00-seed assertions must see the freshly reset demo. */
export default class AlphabeticalSequencer extends BaseSequencer {
  override async sort(files: TestSpecification[]) {
    return [...files].sort((a, b) => a.moduleId.localeCompare(b.moduleId));
  }
}
