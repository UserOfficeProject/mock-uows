import { Group, type GroupDTO } from './UserGroup.ts';
import { Role, type RoleDTO } from './UserRoles.ts';

export interface UserDetails {
  userNumber: number | string;
  title: string;
  givenName: string;
  familyName: string;
  firstNameKnownAs?: string | undefined;
  fullName?: string | undefined;
  displayName?: string | undefined;
  initials?: string | undefined;
  email: string;
  country?: string | undefined;
  orgName?: string | undefined;
  orgAcronym?: string | undefined;
  deptName?: string | undefined;
  deptAcronym?: string | undefined;
  establishmentId?: number | string | undefined;
  fedId?: string | undefined;
  workPhone?: string | undefined;
  mobilePhone?: string | undefined;
  status?: string | undefined;
  roles?: (Role | RoleDTO)[] | undefined;
  groups?: (Group | GroupDTO)[] | undefined;
  sessionId?: string | undefined;
}

export interface BasicPersonDetails {
  country: string | undefined;
  deptAcronym: string | undefined;
  deptName: string | undefined;
  displayName: string;
  email: string;
  establishmentId: string;
  familyName: string;
  fedId: string | undefined;
  firstNameKnownAs: string;
  fullName: string;
  givenName: string;
  initials: string;
  mobilePhone: string | undefined;
  orgAcronym: string | undefined;
  orgName: string | undefined;
  status: string | undefined;
  title: string;
  userNumber: string;
  workPhone: string | undefined;
}

export interface SessionDetails {
  userId: string;
  sessionId: string | undefined;
}

export interface GroupMemberships {
  userNumber: number;
  groups: GroupDTO[];
}

class User {
  readonly userNumber: string;
  private readonly title: string;
  private readonly givenName: string;
  readonly familyName: string;
  private readonly firstNameKnownAs: string;
  private readonly fullName: string;
  private readonly displayName: string;
  private readonly initials: string;
  readonly email: string;
  private readonly country: string | undefined;
  private readonly orgName: string | undefined;
  private readonly orgAcronym: string | undefined;
  private readonly deptName: string | undefined;
  private readonly deptAcronym: string | undefined;
  private readonly establishmentId: string;
  private readonly fedId: string | undefined;
  private readonly workPhone: string | undefined;
  private readonly mobilePhone: string | undefined;
  private readonly status: string | undefined;
  private readonly roles: Role[];
  private groups: Group[];
  readonly sessionId: string | undefined;

  constructor({
    userNumber,
    title,
    givenName,
    familyName,
    firstNameKnownAs,
    fullName,
    displayName,
    initials,
    email,
    country,
    orgName,
    orgAcronym,
    deptName,
    deptAcronym,
    establishmentId,
    fedId,
    workPhone,
    mobilePhone,
    status,
    roles,
    groups,
    sessionId,
  }: UserDetails) {
    this.userNumber = String(userNumber);
    this.title = title;
    this.givenName = givenName;
    this.familyName = familyName;
    this.firstNameKnownAs = firstNameKnownAs ?? givenName;
    this.fullName = fullName ?? `${title} ${givenName} ${familyName}`;
    this.displayName = displayName ?? `${givenName} ${familyName}`;
    this.initials = initials ?? givenName.charAt(0);
    this.email = email;
    this.country = country;
    this.orgName = orgName;
    this.orgAcronym = orgAcronym;
    this.deptName = deptName;
    this.deptAcronym = deptAcronym;
    this.establishmentId = String(establishmentId);
    this.fedId = fedId;
    this.workPhone = workPhone;
    this.mobilePhone = mobilePhone;
    this.status = status;
    this.roles = (roles ?? []).map((role) =>
      role instanceof Role ? role : new Role(role)
    );
    this.groups = (groups ?? []).map((group) =>
      group instanceof Group ? group : new Group(group)
    );
    this.sessionId = sessionId;
  }

  toBasicPersonDetails(): BasicPersonDetails {
    return {
      country: this.country,
      deptAcronym: this.deptAcronym,
      deptName: this.deptName,
      displayName: this.displayName,
      email: this.email,
      establishmentId: this.establishmentId,
      familyName: this.familyName,
      fedId: this.fedId,
      firstNameKnownAs: this.firstNameKnownAs,
      fullName: this.fullName,
      givenName: this.givenName,
      initials: this.initials,
      mobilePhone: this.mobilePhone,
      orgAcronym: this.orgAcronym,
      orgName: this.orgName,
      status: this.status,
      title: this.title,
      userNumber: this.userNumber,
      workPhone: this.workPhone,
    };
  }

  toSessionDetails(): SessionDetails {
    return { userId: this.userNumber, sessionId: this.sessionId };
  }

  toRoles(): RoleDTO[] {
    return this.roles.map((role) => role.toRoleDTO());
  }

  addGroups(groups: (Group | GroupDTO)[]): void {
    for (const group of groups) {
      if (
        this.groups.some((existing) => existing.groupName === group.groupName)
      ) {
        continue;
      }
      this.groups.push(group instanceof Group ? group : new Group(group));
    }
  }

  removeGroup(groupName: string | undefined): void {
    this.groups = this.groups.filter((group) => group.groupName !== groupName);
  }

  toGroupMemberships(): GroupMemberships {
    return {
      userNumber: Number(this.userNumber),
      groups: this.groups.map((group) => group.toGroupDTO()),
    };
  }
}

export { User };
