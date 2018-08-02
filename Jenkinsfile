pipeline {
  agent {
    docker {
      image 'node:10-alpine'
    }

  }
  stages {
    stage('Install') {
      steps {
        sh 'npm install'
      }
    }
    stage('Lint') {
      steps {
        sh 'npm run lint'
      }
    }
    stage('Test') {
      steps {
        sh 'npm run unit'
      }
    }
  }
}