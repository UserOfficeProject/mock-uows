import { logger } from '../utils/logger.ts';
import { userStore } from '../datasources/UserStore.ts';
import { User, type UserDetails } from '../models/User.ts';

let users: UserDetails[] = [];

function seedUsers(): number {
  let createdUsers = 0;
  for (const details of users) {
    try {
      userStore.add(new User(details));
      createdUsers++;
    } catch (error) {
      logger.logException('Skipping user', error, {
        userNumber: details.userNumber,
      });
    }
  }
  logger.logInfo('Seeded user store', {
    'created users': createdUsers,
    skipped: users.length - createdUsers,
  });
  return userStore.size;
}

async function initUsers(): Promise<number> {
  const { default: usersData } = await import('../data/users.json', {
    with: { type: 'json' },
  });
  users = usersData;
  return seedUsers();
}

function resetUsers(): number {
  userStore.clear();
  return seedUsers();
}

export { initUsers, resetUsers };
