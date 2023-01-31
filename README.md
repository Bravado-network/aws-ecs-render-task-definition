## Creates a new Amazon ECS task definition JSON file with new container image URI, environment and secrets from AWS SSM params 

It inserts 3 things into an AWS ECS task definition JSON file:
- A new container image URI
- Environment variables loaded from AWS SSM
- Secrets loaded from AWS SSM

It loads AWS SSM params based on the `ssm-param-paths` attribute. AWS SSM params of type `String` will be set to [ECS task definition environment variables](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/taskdef-envfiles.html) list. The SSM params of type `SecureString` will be set to [ECS task definition secrets](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data-secrets.html) list.
`ssm-param-paths` accepts a comma separated values for SSM param paths. For example, if you want to include all SSM params from `/dev-base/backend` and `/dev4/backend` paths, you can do the following:
```
ssm-param-paths: /dev-base/backend, /dev4/backend
```
Notice that the order matters. In the exemplo above, if both `/dev-base/backend` and `/dev4/backend` paths define the same environment variable, the one defined in `/dev4/backend` will override the one defined in `/dev-base/backend`.

## Usage

To insert the image URI `amazon/amazon-ecs-sample:latest` as the image for the `backend` container in the task definition file, loads AWS SSM params by path `/production/backend/` and sets environment variables and secrets, and then deploy the edited task definition file to ECS:

The following example sets the image URI `amazon/amazon-ecs-sample:latest` as the image for the `backend` container in the new task definition file. Additionaly, it will pull SSM params from `/dev-base/backend` and `/dev4/backend` paths and them as[environment](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/taskdef-envfiles.html) and [secrets](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data-secrets.html) to the new task definition file.

```yaml
    - name: Fill in the new image ID in the Amazon ECS task definition
      id: task-def
      uses: Bravado-network/aws-ecs-render-task-definition@v1
      with:
        task-definition: backend-task-definition.json
        container-name: backend
        ssm-param-paths: /dev-base/backend, /dev4/backend
        image: amazon/amazon-ecs-sample:latest

    - name: Deploy Rails
      uses: aws-actions/amazon-ecs-deploy-task-definition@v1
      with:
        task-definition: ${{ steps.task-def.outputs.task-definition }}
        service: backend
        cluster: ecs-cluster
        wait-for-service-stability: true
        force-new-deployment: true
```

See [action.yml](action.yml) for the full documentation for this action's inputs and outputs.

