import json

def collect_test_cases():
    test_cases = []

    print("Enter test cases. Leave input empty and just press Enter to stop.\n")

    while True:
        print("Enter input (use \\n for newlines, e.g. '3\\n1 2 3'):")
        test_input = input("Input: ").strip()
        if test_input == "":
            break

        test_output = input("Output: ").strip()
        decoded_input = test_input.encode().decode('unicode_escape')

        test_cases.append({
            "input": decoded_input,
            "output": test_output
        })
        print("Test case added!\n")

    return test_cases

if __name__ == "__main__":
    data = collect_test_cases()
    print("\nCollected test cases:")
    print(json.dumps(data, indent=2))
