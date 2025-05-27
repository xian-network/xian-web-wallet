// This is a sample submission contract file that can be loaded into the IDE
// It's a simple contract that works with the sample test

const sampleSubmissionCode = `# submission.s.py
# This is a simple contract that will be used in the tests

@construct
def seed():
    pass

@export
def hello():
    return "Hello, World!"
`;

// Export the sample submission code
export { sampleSubmissionCode };