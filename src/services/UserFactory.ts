import { fakerEN_GB as faker } from '@faker-js/faker';
import { userStore } from '../datasources/UserStore.ts';
import { User } from '../models/User.ts';

interface UsersRequest {
  userCount: number;
  startUserNumber?: number | undefined;
}

function acronym(name: string): string {
  return name
    .split(/[^A-Za-z]+/)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

class UserFactory {
  private readonly store = userStore;

  createUsers(userInput: UsersRequest): User[] {
    const count = userInput.userCount;
    const startUserNumber =
      userInput.startUserNumber ?? (this.store.lastUserNumber ?? -1) + 1;
    const created: User[] = [];
    try {
      for (
        let userNumber = startUserNumber;
        userNumber < startUserNumber + count;
        userNumber++
      ) {
        created.push(this.store.add(this.createUser(userNumber)));
      }
    } catch (error) {
      for (const user of created) this.store.remove(user.userNumber);
      throw error;
    }

    return created;
  }

  private createUser(userNumber: number): User {
    const sexType = faker.person.sexType();
    const orgName = faker.company.name();
    const deptName = faker.commerce.department();
    return new User({
      userNumber,
      title: faker.person.prefix(sexType).replace('.', ''),
      givenName: faker.person.firstName(sexType),
      familyName: faker.person.lastName(),
      email: `email-${userNumber}@example.com`,
      country: faker.location.country().toUpperCase(),
      orgName,
      orgAcronym: acronym(orgName),
      deptName,
      deptAcronym: acronym(deptName),
      establishmentId: faker.number.int({ min: 1, max: 1000 }),
      workPhone: faker.phone.number(),
      mobilePhone: faker.phone.number(),
      roles: [
        {
          name: 'User',
        },
      ],
      sessionId: `token-${userNumber}`,
    });
  }
}

export { UserFactory };
export type { UsersRequest };
