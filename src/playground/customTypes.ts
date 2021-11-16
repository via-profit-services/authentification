const customTypes = /* GraphQL */ `
  type Me {
    id: ID!
    name: String!
    login: String!
    token: AccessToken!
  }

  extend type Query {
    me: Me!
  }
`;

export default customTypes;
