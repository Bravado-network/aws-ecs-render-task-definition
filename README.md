## Creates a new Amazon ECS task definition JSON file with new container image URI, environment and secrets from AWS SSM params 

Inserts 3 things into an AWS ECS task definition JSON file:
- A new container image URI
- Environment variables loaded from AWS SSM
- Secrets loaded from AWS SSM

It loads AWS SSM params based on the `ssm-param-path-pattern` attribute. AWS SSM params of type `String` will be set to [ECS task definition environment variables](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/taskdef-envfiles.html) list. The SSM params of type `SecureString` will be set to [ECS task definition secrets](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data-secrets.html) list.

## Usage

To insert the image URI `amazon/amazon-ecs-sample:latest` as the image for the `backend` container in the task definition file, loads AWS SSM params by path `/production/backend/` and sets environment variables and secrets, and then deploy the edited task definition file to ECS:

```yaml
    - name: Fill in the new image ID in the Amazon ECS task definition
      id: task-def
      uses: Bravado-network/aws-ecs-render-task-definition@v1
      with:
        task-definition: backend-task-definition.json
        container-name: backend
        ssm-param-path-pattern: /production/backend/
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

