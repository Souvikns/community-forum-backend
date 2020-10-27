const app = require("../app").app;
const supertest = require("supertest");
const request = supertest(app);

module.exports = {
  testCreateOrganization: async () => {
    const response = await request
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
    return response;
  },
  testCreateUser: async (userNo) => {
    const response = await request
      .post("/graphql")
      .send({
        query: `mutation{ createUser(userInput: {
          name: {
            firstName: "TestUser"
            lastName: "${userNo}"
          }
          email: "abc${userNo}@email.com"
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
        isAdmin
        isModerator
      }}`,
      })
      .set("Accept", "application/json");
    return response;
  },
  testLoginUser: async (userNo) => {
    const response = await request
      .post("/graphql")
      .send({
        query: `{ login(
        email: "abc${userNo}@email.com"
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
    return response;
  },
  testCreateCategory: async (token) => {
    const response = await request
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
      .set("Authorization", `Bearer ${token}`);
    return response;
  },
  testCreateTopic: async (token, categoryId) => {
    const response = await request
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
        name
        description
        parentCategory
        createdBy
      }}`,
      })
      .set("Accept", "application/json")
      .set("Authorization", `Bearer ${token}`);
    return response;
  },
  testCreateMessage: async (token, topicId) => {
    const response = await request
      .post("/graphql")
      .send({
        query: `mutation{ createMessage(
        messageInput: {
          description: "Lorem Ipsum"
          parentTopic: "${topicId}"
        }
      ) {
        _id
        description
        parentTopic
      }}`,
      })
      .set("Accept", "application/json")
      .set("Authorization", `Bearer ${token}`);
    return response;
  },
  testCreateTask: async (
    token,
    topicId,
    messageId = undefined,
    assignedTo = undefined
  ) => {
    let response;
    if (messageId == undefined) {
      if (assignedTo == undefined) {
        response = await request
          .post("/graphql")
          .send({
            query: `mutation{ createTask(
              taskInput: {
                description: "Lorem Ipsum"
                deadline: "2020-02-20T02:20:20Z"
                parentTopic: "${topicId}"
              }
            ) {
              _id
              description
              deadline
              assignedTo
              attachedMessage
              parentTopic
            }}`,
          })
          .set("Accept", "application/json")
          .set("Authorization", `Bearer ${token}`);
      } else {
        response = await request
          .post("/graphql")
          .send({
            query: `mutation{ createTask(
              taskInput: {
                description: "Lorem Ipsum"
                deadline: "2020-02-20T02:20:20Z"
                assignedTo: "${assignedTo}"
                parentTopic: "${topicId}"
              }
            ) {
              _id
              description
              deadline
              assignedTo
              attachedMessage
              parentTopic
            }}`,
          })
          .set("Accept", "application/json")
          .set("Authorization", `Bearer ${token}`);
      }
    } else {
      if (assignedTo == undefined) {
        response = await request
          .post("/graphql")
          .send({
            query: `mutation{ createTask(
              taskInput: {
                description: "Lorem Ipsum"
                deadline: "2020-02-20T02:20:20Z"
                attachedMessage: "${messageId}"
                parentTopic: "${topicId}"
              }
            ) {
              _id
              description
              deadline
              assignedTo
              attachedMessage
              parentTopic
            }}`,
          })
          .set("Accept", "application/json")
          .set("Authorization", `Bearer ${token}`);
      } else {
        response = await request
          .post("/graphql")
          .send({
            query: `mutation{ createTask(
              taskInput: {
                description: "Lorem Ipsum"
                deadline: "2020-02-20T02:20:20Z"
                assignedTo: "${assignedTo}"
                attachedMessage: "${messageId}"
                parentTopic: "${topicId}"
              }
            ) {
              _id
              description
              deadline
              assignedTo
              attachedMessage
              parentTopic
            }}`,
          })
          .set("Accept", "application/json")
          .set("Authorization", `Bearer ${token}`);
      }
    }
    return response;
  },
};