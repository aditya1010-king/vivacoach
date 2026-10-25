-- SAMPLE lab so you can see the app working end to end.
-- Replace with your real university/lab before showing it to classmates.
-- Run in Supabase SQL Editor after 001_schema.sql.

insert into public.labs (id, university, branch, semester, name) values
  ('sample-ce-3-dsl', 'Sample University', 'Computer Engineering', 3, 'Data Structures Lab (sample)');

insert into public.experiments (id, lab_id, position, title) values
  ('sample-ce-3-dsl-e1', 'sample-ce-3-dsl', 1, 'Searching: linear and binary search'),
  ('sample-ce-3-dsl-e2', 'sample-ce-3-dsl', 2, 'Stack: infix to postfix conversion'),
  ('sample-ce-3-dsl-e3', 'sample-ce-3-dsl', 3, 'Singly linked list operations');

-- Experiment 1: Searching
insert into public.questions (experiment_id, position, question, model_answer, key_points, difficulty) values
('sample-ce-3-dsl-e1', 1,
 'What is the difference between linear search and binary search?',
 'Linear search checks each element one by one from the start until it finds the key or reaches the end, so it works on unsorted data and takes O(n) time. Binary search works only on sorted data: it compares the key with the middle element and discards half of the remaining range each step, so it takes O(log n) time.',
 array['linear checks elements one by one','linear works on unsorted data','linear is O(n)','binary needs sorted data','binary halves the search range using the middle element','binary is O(log n)'], 1),
('sample-ce-3-dsl-e1', 2,
 'Why must the array be sorted for binary search?',
 'Binary search decides which half to discard by comparing the key with the middle element. That decision is only correct if every element on the left is smaller and every element on the right is larger, which is true only when the array is sorted. On unsorted data it can discard the half that contains the key.',
 array['decision based on comparison with middle','left smaller / right larger only if sorted','unsorted data can discard the half containing the key'], 1),
('sample-ce-3-dsl-e1', 3,
 'What are the best, worst and average case time complexities of binary search?',
 'Best case is O(1), when the key is the middle element on the first comparison. Worst and average cases are O(log n), because the range halves each step, so at most about log2(n) + 1 comparisons are needed.',
 array['best case O(1) when key is at middle','worst case O(log n)','average case O(log n)','range halves each step'], 2),
('sample-ce-3-dsl-e1', 4,
 'How do you calculate the middle index in binary search, and why is low + (high - low) / 2 preferred?',
 'mid = low + (high - low) / 2. It gives the same result as (low + high) / 2, but avoids integer overflow when low and high are large, because low + high can exceed the maximum integer value.',
 array['mid = low + (high - low) / 2','same as (low + high) / 2 mathematically','avoids integer overflow'], 2),
('sample-ce-3-dsl-e1', 5,
 'When would you prefer linear search over binary search?',
 'When the data is unsorted and will only be searched once or a few times (sorting costs O(n log n)), when the list is very small, or when the data is in a structure without random access, such as a linked list, where jumping to the middle is not O(1).',
 array['unsorted data searched rarely','sorting cost O(n log n)','very small lists','no random access e.g. linked list'], 2),
('sample-ce-3-dsl-e1', 6,
 'Write the stopping condition of iterative binary search. What happens if the key is not present?',
 'The loop runs while low <= high. If the key is not present, low eventually becomes greater than high, the loop ends, and the function returns a sentinel such as -1 to show the key was not found.',
 array['loop while low <= high','low crosses high when key absent','return -1 or sentinel for not found'], 2);

-- Experiment 2: Stack, infix to postfix
insert into public.questions (experiment_id, position, question, model_answer, key_points, difficulty) values
('sample-ce-3-dsl-e2', 1,
 'What is a stack? Name its basic operations.',
 'A stack is a linear data structure that follows Last In, First Out (LIFO): the last element inserted is the first removed. Basic operations are push (insert at top), pop (remove from top), peek or top (read the top element without removing it), and isEmpty / isFull checks.',
 array['linear data structure','LIFO','push','pop','peek / top','isEmpty / isFull'], 1),
('sample-ce-3-dsl-e2', 2,
 'What are stack overflow and stack underflow?',
 'Overflow happens when you push onto a stack that is already full (for an array-based stack, top equals size minus 1). Underflow happens when you pop from an empty stack (top equals -1). Both should be checked before the operation.',
 array['overflow = push on full stack','underflow = pop on empty stack','top == size-1 means full','top == -1 means empty'], 1),
('sample-ce-3-dsl-e2', 3,
 'Why do we convert infix expressions to postfix?',
 'Postfix needs no parentheses and no precedence rules during evaluation: operators appear after their operands in the order they must be applied. This lets a computer evaluate the expression in a single left-to-right scan using a stack, which is simpler and faster than evaluating infix.',
 array['no parentheses needed','no precedence rules during evaluation','single left-to-right scan','evaluated easily with a stack'], 2),
('sample-ce-3-dsl-e2', 4,
 'Explain the algorithm to convert infix to postfix using a stack.',
 'Scan the infix expression left to right. Operands go straight to the output. A left parenthesis is pushed. On a right parenthesis, pop to output until the matching left parenthesis, then discard both. On an operator, pop operators with higher precedence (or equal precedence for left-associative operators) to the output, then push the current operator. At the end, pop all remaining operators to the output.',
 array['scan left to right','operands to output','push left parenthesis','pop until left parenthesis on right parenthesis','pop higher/equal precedence before pushing operator','pop remaining operators at end'], 3),
('sample-ce-3-dsl-e2', 5,
 'Convert A + B * C to postfix and explain why.',
 'The postfix form is A B C * +. Multiplication has higher precedence than addition, so B * C is applied first: B and C are followed by *, and the + comes last, applying to A and the result of B * C.',
 array['answer A B C * +','* has higher precedence than +','B * C evaluated first','+ applied last'], 2),
('sample-ce-3-dsl-e2', 6,
 'Give two real applications of a stack other than expression conversion.',
 'Function call management (the call stack stores return addresses and local variables), undo in editors, browser back navigation, checking balanced parentheses, and backtracking such as depth-first search or maze solving. Any two with a short reason is enough.',
 array['function call stack','undo','browser back','balanced parentheses','backtracking / DFS'], 1);

-- Experiment 3: Singly linked list
insert into public.questions (experiment_id, position, question, model_answer, key_points, difficulty) values
('sample-ce-3-dsl-e3', 1,
 'What is a singly linked list and how is a node structured?',
 'A singly linked list is a linear collection of nodes where each node stores data and a pointer (next) to the following node. The list is accessed through a head pointer, and the last node''s next pointer is NULL.',
 array['collection of nodes','node has data and next pointer','head pointer to first node','last node next is NULL'], 1),
('sample-ce-3-dsl-e3', 2,
 'What are the advantages and disadvantages of a linked list compared with an array?',
 'Advantages: dynamic size, and insertion or deletion is O(1) once you have the position, with no shifting of elements. Disadvantages: no random access, so reaching the i-th element is O(n); extra memory for each pointer; and poorer cache locality than an array.',
 array['dynamic size','O(1) insert/delete at known position, no shifting','no random access, O(n) access','extra memory for pointers','poor cache locality'], 2),
('sample-ce-3-dsl-e3', 3,
 'How do you insert a node at the beginning of a singly linked list?',
 'Create a new node, set its data, set newNode.next = head, then set head = newNode. It takes O(1) time and also works when the list is empty, because head is NULL.',
 array['create new node','newNode.next = head','head = newNode','O(1)','works for empty list'], 1),
('sample-ce-3-dsl-e3', 4,
 'How do you delete a node with a given value from a singly linked list?',
 'If the head holds the value, move head to head.next and free the old node. Otherwise traverse with a pointer to the previous node until prev.next holds the value, then set prev.next = prev.next.next and free the removed node. If the end is reached, the value is not present. Time is O(n).',
 array['special case when head holds the value','traverse keeping previous node','prev.next = prev.next.next','free removed node','handle value not found','O(n)'], 2),
('sample-ce-3-dsl-e3', 5,
 'How would you reverse a singly linked list?',
 'Use three pointers: prev = NULL, curr = head, next. In a loop, save next = curr.next, point curr.next = prev, then move prev = curr and curr = next. When curr becomes NULL, set head = prev. It runs in O(n) time and O(1) extra space.',
 array['three pointers prev, curr, next','curr.next = prev','advance prev and curr','head = prev at end','O(n) time, O(1) space'], 3),
('sample-ce-3-dsl-e3', 6,
 'What is the difference between a singly, doubly and circular linked list?',
 'In a singly linked list each node points only to the next node. In a doubly linked list each node also has a prev pointer, so you can traverse both ways and delete a known node in O(1), at the cost of extra memory. In a circular linked list the last node points back to the first node instead of NULL.',
 array['singly: next only','doubly: next and prev','doubly allows two-way traversal','doubly costs extra memory','circular: last node points to first'], 2);
