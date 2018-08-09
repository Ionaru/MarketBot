pipeline {
  agent {
    docker {
      image 'node:10-jessie'
    }

  }
  stages {
    stage('Install') {
      steps {
        sh 'npm install'
      }
    }
    stage('Run tests') {
      parallel {
        stage('Lint') {
          steps {
            sh 'npm run lint'
          }
        }
        stage('Unit') {
          steps {
            sh 'npm run unit'
            junit 'test-results.xml'
          }
        }
      }
    }
  }
}