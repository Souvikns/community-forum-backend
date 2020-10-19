const { 
  userBlockResult,
  userRemoveResult,
} = require("../graphql/variables/resultMessages");
const {
  authenticationError,
  noAuthorizationError,
} = require("../graphql/variables/errorMessages");

const app = require("../app").app;
const supertest = require("supertest");
const request = supertest(app);
const mongoose = require("mongoose");
const Organization = require("../models/organization");
const User = require("../models/user");
const server = require("../app").server;
const jwt = require("jsonwebtoken");

let connection, userId, firstUserLoginResponse, firstUserToken;

beforeAll(async (done) => {
  connection = await server.listen(process.env.PORT);
  console.log(`Test: listening on ${process.env.PORT}`);
  await User.deleteMany({});
  await Organization.deleteMany({});
  const Category = require("../models/category");
  const Topic = require("../models/topic");
  const organizationResponse = await request
    .post("/graphql")
    .send({
      query: `mutation{ createOrganization(organizationInput: {
          name: "Test Organization"
          description: {
            shortDescription: "Lorem Ipsum"
          }
          contactInfo: {
            email: "test@email.com"
            website: "www.website.com"
          }
      }) {
        result
      }}`,
    })
    .set("Accept", "application/json");
  await done();
});

afterAll(async () => {
  await connection.close();
  await mongoose.connection.close();
});

test("should signup new user", async () => {
  const response = await request
    .post("/graphql")
    .send({
      query: `mutation{ createUser(userInput: {
          name: {
            firstName: "TestUser"
            lastName: "1"
          }
          email: "abc1@email.com"
          password: "password"
          info: {
            about: {
              shortDescription: "Lorem Ipsum"
            }
          }
      }) {
        _id
        name {
          firstName
          lastName
        }
        email
        phone
      }}`,
    })
    .set("Accept", "application/json");
  expect(response.type).toBe("application/json");
  expect(response.status).toBe(200);
  expect(response.body.data.createUser.name).toStrictEqual({
    firstName: "TestUser",
    lastName: "1"
  });
  expect(response.body.data.createUser.email).toBe("abc1@email.com");
  expect(response.body.data.createUser.phone).toBe(null);
  userId = response.body.data.createUser._id;
});

test("get all users via admin authorization", async () => {
  firstUserLoginResponse = await request
    .post("/graphql")
    .send({
      query: `{ login(
        email: "abc1@email.com"
        password: "password"
      ) {
        name {
          firstName
          lastName
        }
        token
      } }`,
    })
    .set("Accept", "application/json");
  firstUserToken = firstUserLoginResponse.body.data.login.token;
  const response = await request
    .post("/graphql")
    .send({
      query: `{ users {
      _id
      name {
        firstName
      }
      email
  }}`,
    })
    .set("Accept", "application/json")
    .set("Authorization", `Bearer ${firstUserToken}`);
  expect(response.type).toBe("application/json");
  expect(response.status).toBe(200);
  expect(response.body.data.users.length).toBe(1);
  expect(response.body.data.users[0].name.firstName).toBe("TestUser");
  expect(response.body.data.users[0].email).toBe("abc1@email.com");
});

test("should not update user details if logged out", async () => {
  const response = await request
    .post("/graphql")
    .send({
      query: `mutation{ updateUser(
        userInput: {
          name: {
            firstName: "Updated TestUser"
            lastName: "1"
          }
          phone: "0000000000"
          info: {
            about: {
              shortDescription: "Lorem Ipsum"
            }
          }
        }
      ) {
        name {
          firstName
        }
        phone
      }}`,
    })
    .set("Accept", "application/json")
  expect(response.type).toBe("application/json");
  expect(response.status).toBe(500);
  expect(response.body.errors[0].message).toBe(authenticationError);
});

test("should update user details if logged in", async () => {
  const response = await request
    .post("/graphql")
    .send({
      query: `mutation{ updateUser(
        userInput: {
          name: {
            firstName: "Updated TestUser"
            lastName: "1"
          }
          phone: "0000000000"
          info: {
            about: {
              shortDescription: "Updated Lorem Ipsum"
            }
          }
        }
      ) {
        name {
          firstName
        }
        phone
      }}`,
    })
    .set("Accept", "application/json")
    .set("Authorization", `Bearer ${firstUserToken}`);
  expect(response.type).toBe("application/json");
  expect(response.status).toBe(200);
  expect(response.body.data.updateUser.name.firstName).toBe("Updated TestUser");
  expect(response.body.data.updateUser.phone).toBe("0000000000");
});

test("admin should be able to block other users", async () => {
  const userCreationResponse = await request
    .post("/graphql")
    .send({
      query: `mutation{ createUser(userInput: {
          name: {
            firstName: "TestUser"
            lastName: "2"
          }
          email: "abc2@email.com"
          password: "password"
          info: {
            about: {
              shortDescription: "Lorem Ipsum"
            }
          }
      }) {
        _id
        name {
          firstName
          lastName
        }
        email
        phone
      }}`,
    })
    .set("Accept", "application/json");
  const response = await request
    .post("/graphql")
    .send({
      query: `mutation{ blockUser(userFindInput: {
      email: "abc2@email.com" 
    }) {
      result
    }}`,
    })
    .set("Accept", "application/json")
    .set("Authorization", `Bearer ${firstUserToken}`);
    expect(response.type).toBe("application/json");
    expect(response.status).toBe(200);
    expect(response.body.data.blockUser.result).toBe(userBlockResult);
    const organization = await Organization.findOne({}).lean();
    expect(organization.blockedUsers.length).toBe(1);
    expect(organization.totalUsers).toBe(2);
});

test("admin should be able to remove other users", async () => {
  const response = await request
    .post("/graphql")
    .send({
      query: `mutation{ removeUser(userFindInput: {
      email: "abc2@email.com" 
    }) {
      result
    }}`,
    })
    .set("Accept", "application/json")
    .set("Authorization", `Bearer ${firstUserToken}`);
  expect(response.type).toBe("application/json");
  expect(response.status).toBe(200);
  expect(response.body.data.removeUser.result).toBe(userRemoveResult);
  const organization = await Organization.findOne({}).lean();
  expect(organization.removedUsers.length).toBe(1);
  expect(organization.totalUsers).toBe(1);
});

test("current user should be able to himself", async () => {
  const userCreationResponse = await request
    .post("/graphql")
    .send({
      query: `mutation{ createUser(userInput: {
          name: {
            firstName: "TestUser"
            lastName: "3"
          }
          email: "abc3@email.com"
          password: "password"
          info: {
            about: {
              shortDescription: "Lorem Ipsum"
            }
          }
      }) {
        _id
        name {
          firstName
          lastName
        }
        email
        phone
      }}`,
    })
    .set("Accept", "application/json");
  const userLoginResponse = await request
    .post("/graphql")
    .send({
      query: `{ login(
        email: "abc3@email.com"
        password: "password"
      ) {
        name {
          firstName
          lastName
        }
        token
      } }`,
    })
    .set("Accept", "application/json");
  const token = userLoginResponse.body.data.login.token;
  const response = await request
    .post("/graphql")
    .send({
      query: `mutation{ removeUser(userFindInput: {
    }) {
      result
    }}`,
    })
    .set("Accept", "application/json")
    .set("Authorization", `Bearer ${token}`);
  expect(response.type).toBe("application/json");
  expect(response.status).toBe(200);
  expect(response.body.data.removeUser.result).toBe(userRemoveResult);
  const organization = await Organization.findOne({}).lean();
  expect(organization.removedUsers.length).toBe(2);
  expect(organization.totalUsers).toBe(1);
});

test("current user should be able to get categories created by him", async () => {
  const categoryCreationResponse = await request
    .post("/graphql")
    .send({
      query: `mutation{ createCategory(
        categoryInput: {
          name: "Test Category"
          description: "Lorem Ipsum"
        }
      ) {
        _id
        name
        description
        createdBy
      }}`,
    })
    .set("Accept", "application/json")
    .set("Authorization", `Bearer ${firstUserToken}`);
  const categoryId = categoryCreationResponse.body.data.createCategory._id;
  const response = await request
    .post("/graphql")
    .send({
      query: `{ getSelfCategories {
      _id
      name
    }}`,
    })
    .set("Accept", "application/json")
    .set("Authorization", `Bearer ${firstUserToken}`);
    expect(response.type).toBe("application/json");
    expect(response.status).toBe(200);
    expect(response.body.data.getSelfCategories.length).toBe(1);
    expect(response.body.data.getSelfCategories[0].name).toBe("Test Category");
});

test("current user should be able to get topics created by him", async () => {
  const categoryCreationResponse = await request
    .post("/graphql")
    .send({
      query: `mutation{ createCategory(
        categoryInput: {
          name: "Test Category"
          description: "Lorem Ipsum"
        }
      ) {
        _id
      }}`,
    })
    .set("Accept", "application/json")
    .set("Authorization", `Bearer ${firstUserToken}`);
  const categoryId = categoryCreationResponse.body.data.createCategory._id;
  const topicCreationResponse = await request
    .post("/graphql")
    .send({
      query: `mutation{ createTopic(
        topicInput: {
          name: "Test Topic"
          description: "Lorem Ipsum"
          parentCategory: "${categoryId}"
        }
      ) {
        _id
      }}`,
    })
    .set("Accept", "application/json")
    .set("Authorization", `Bearer ${firstUserToken}`);
  const response = await request
    .post("/graphql")
    .send({
      query: `{ getSelfTopics {
      _id
      name
    }}`,
    })
    .set("Accept", "application/json")
    .set("Authorization", `Bearer ${firstUserToken}`);
  expect(response.type).toBe("application/json");
  expect(response.status).toBe(200);
  expect(response.body.data.getSelfTopics.length).toBe(1);
  expect(response.body.data.getSelfTopics[0].name).toBe("Test Topic");
});