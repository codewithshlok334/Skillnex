"""Medium reference-inspired appendix, executed by build_codelab_bank.py.

Adapters and explanations are original. The first two answers for each problem
are manually supplied to add(), which checks them before creating the bank.
"""

def _cm_array(values, *header):
    return ' '.join(map(str, (len(values),) + header)) + '\n' + ' '.join(map(str, values)) + '\n'


add('curated-longest-substring-without-repeating-characters', 'Longest Substring Without Repeating Characters', 'Sliding window', 'Medium',
 'Find the length of the longest contiguous part of a string whose characters are all different. Character comparisons are case-sensitive.',
 'First token: n, the string length. If n is positive, the next token is the string; if n is zero, there is no string token.',
 'Print the maximum length; an empty string has answer 0.',
 ['0 <= n <= 200000', 'The string contains only ASCII letters and digits.'],
 'Track the most recent index of each character. When a character repeats inside the current window, move the left boundary just past its previous occurrence. Never move the boundary backward.',
 'O(n) time, O(1) auxiliary space for the fixed ASCII alphabet.',
 ['A substring must be contiguous.', 'Use max(left, previousIndex + 1) when a character repeats.'],
 '''int n=f.i();String s=n==0?"":f.next();int[]last=new int[128];Arrays.fill(last,-1);int left=0,best=0;for(int right=0;right<n;right++){char ch=s.charAt(right);left=Math.max(left,last[ch]+1);last[ch]=right;best=Math.max(best,right-left+1);}System.out.println(best);''',
 '''int n;cin>>n;string s;if(n)cin>>s;vector<int>last(128,-1);int left=0,best=0;for(int right=0;right<n;right++){unsigned char ch=s[right];left=max(left,last[ch]+1);last[ch]=right;best=max(best,right-left+1);}cout<<best;''',
 '''n=ni();s=next(data) if n else '';last={};left=best=0
for right,ch in enumerate(s):
 left=max(left,last.get(ch,-1)+1);last[ch]=right;best=max(best,right-left+1)
print(best)''',
 ['8\nabcabcbb\n','6\npwwkew\n','0\n','4\nabba\n','1\nZ\n','6\naA0aA0\n','100000\n'+'a'*100000+'\n'], ['3','3'])

add('curated-group-anagrams', 'Group Anagrams', 'Hashing', 'Medium',
 'Partition all supplied words into groups. Two words belong together exactly when rearranging one word can produce the other. Repeated words must remain repeated in the output.',
 'n, followed by n nonempty lowercase English words. n may be zero.',
 'Print the number of groups on the first line. For each group print its word count followed by its words on one line. Groups and words within each group may appear in any order.',
 ['0 <= n <= 1000', '1 <= each word length <= 30', 'Total word length <= 20000.'],
 'Sort the letters of each word to obtain its anagram signature and collect words with the same signature. The reference sorts signatures and group members only for reproducible examples.',
 'O(S log L + n log n) time for the reproducibly sorted reference, O(S+n) space; S is total input length and L the maximum word length.',
 ['Every occurrence of a word must be placed in one group.', 'A sorted-letter signature is identical for all anagrams.'],
 '''int n=f.i();TreeMap<String,List<String>>groups=new TreeMap<>();for(int i=0;i<n;i++){String word=f.next();char[]chars=word.toCharArray();Arrays.sort(chars);groups.computeIfAbsent(new String(chars),k->new ArrayList<>()).add(word);}StringBuilder out=new StringBuilder().append(groups.size()).append('\n');for(List<String>group:groups.values()){Collections.sort(group);out.append(group.size());for(String word:group)out.append(' ').append(word);out.append('\n');}System.out.print(out);'''.replace("'\n'", "'\\n'"),
 '''int n;cin>>n;unordered_map<string,vector<string>>groups;vector<string>keys;for(int i=0;i<n;i++){string word;cin>>word;string key=word;sort(key.begin(),key.end());if(!groups.count(key))keys.push_back(key);groups[key].push_back(word);}sort(keys.begin(),keys.end());cout<<keys.size()<<'\n';for(auto&key:keys){auto&group=groups[key];sort(group.begin(),group.end());cout<<group.size();for(auto&word:group)cout<<' '<<word;cout<<'\n';}'''.replace("'\n'", "'\\n'"),
 '''n=ni();groups={}
for _ in range(n):
 word=next(data);groups.setdefault(''.join(sorted(word)),[]).append(word)
print(len(groups))
for key in sorted(groups):
 group=sorted(groups[key]);print(len(group),*group)''',
 ['6\neat tea tan ate nat bat\n','4\na a b ab\n','0\n','1\nsolo\n','5\nab ba abc cab bca\n','4\naaaa aa a aaa\n','1000\n'+'abc '*1000+'\n'],
 ['3\n1 bat\n3 ate eat tea\n2 nat tan', '3\n2 a a\n1 ab\n1 b'], checker='UNORDERED_GROUPS')

add('curated-3sum', '3Sum', 'Two pointers', 'Medium',
 'Find every distinct triple of values that sums to zero using three different array positions. Repeated input values are allowed, but each value triple must be printed only once.',
 'n, followed by n integers.',
 'Print the number of triples, then one triple per line. Values within each triple must be in nondecreasing order. Triple lines may appear in any order. Print only 0 when no triple exists.',
 ['0 <= n <= 300', '-1000000 <= value <= 1000000', 'The input has at most 1000 distinct zero-sum triples.'],
 'Sort the array. Fix each distinct first value and scan the remaining suffix with two pointers. Move the lower pointer when the sum is negative and the upper pointer when it is positive; after a match, skip repeated endpoint values.',
 'O(n^2) time, O(n+t) space including sorted input and t output triples.',
 ['Three copies of 0 yield one triple, but two copies do not.', 'Skip duplicates both for the fixed value and after recording a pair.'],
 '''int n=f.i();int[]a=new int[n];for(int i=0;i<n;i++)a[i]=f.i();Arrays.sort(a);List<int[]>out=new ArrayList<>();for(int i=0;i<n-2;i++){if(i>0&&a[i]==a[i-1])continue;int l=i+1,r=n-1;while(l<r){int sum=a[i]+a[l]+a[r];if(sum<0)l++;else if(sum>0)r--;else{out.add(new int[]{a[i],a[l],a[r]});int x=a[l],y=a[r];while(l<r&&a[l]==x)l++;while(l<r&&a[r]==y)r--;}}}System.out.println(out.size());for(int[]row:out)System.out.println(row[0]+" "+row[1]+" "+row[2]);''',
 '''int n;cin>>n;vector<int>a(n);for(int&x:a)cin>>x;sort(a.begin(),a.end());vector<vector<int>>out;for(int i=0;i<n-2;i++){if(i&&a[i]==a[i-1])continue;int l=i+1,r=n-1;while(l<r){int sum=a[i]+a[l]+a[r];if(sum<0)l++;else if(sum>0)r--;else{out.push_back({a[i],a[l],a[r]});int x=a[l],y=a[r];while(l<r&&a[l]==x)l++;while(l<r&&a[r]==y)r--;}}}cout<<out.size()<<'\n';for(auto&row:out)cout<<row[0]<<' '<<row[1]<<' '<<row[2]<<'\n';'''.replace("'\n'", "'\\n'"),
 '''n=ni();a=sorted(ni() for _ in range(n));out=[]
for i in range(n-2):
 if i and a[i]==a[i-1]:continue
 l=i+1;r=n-1
 while l<r:
  total=a[i]+a[l]+a[r]
  if total<0:l+=1
  elif total>0:r-=1
  else:
   out.append((a[i],a[l],a[r]));x,y=a[l],a[r]
   while l<r and a[l]==x:l+=1
   while l<r and a[r]==y:r-=1
print(len(out))
for row in out:print(*row)''',
 [_cm_array([-1,0,1,2,-1,-4]),_cm_array([0,0,0,0]),_cm_array([]),_cm_array([0,0]),_cm_array([1,2,3]),_cm_array([-2,0,0,2,2]),_cm_array([0]*300)],
 ['2\n-1 -1 2\n-1 0 1','1\n0 0 0'], checker='UNORDERED_LINES')

add('curated-container-with-most-water', 'Container With Most Water', 'Two pointers', 'Medium',
 'Vertical lines stand at integer positions 0 through n-1. A pair of lines holds an area equal to their distance multiplied by the shorter height. Find the largest possible area.',
 'n, followed by n nonnegative heights.', 'Print the maximum area as a 64-bit integer.',
 ['2 <= n <= 100000', '0 <= height <= 1000000000'],
 'Start at the outermost lines. Record their area, then move the pointer at the shorter line: keeping that line while reducing the width cannot improve the area.',
 'O(n) time, O(n) space for input and O(1) auxiliary space.',
 ['The shorter line limits the water height.', 'Multiply using 64-bit arithmetic before comparing areas.'],
 '''int n=f.i();long[]a=new long[n];for(int i=0;i<n;i++)a[i]=f.l();int l=0,r=n-1;long best=0;while(l<r){best=Math.max(best,(r-l)*Math.min(a[l],a[r]));if(a[l]<=a[r])l++;else r--;}System.out.println(best);''',
 '''int n;cin>>n;vector<long long>a(n);for(auto&x:a)cin>>x;int l=0,r=n-1;long long best=0;while(l<r){best=max(best,(r-l)*min(a[l],a[r]));if(a[l]<=a[r])l++;else r--;}cout<<best;''',
 '''n=ni();a=[ni() for _ in range(n)];l=0;r=n-1;best=0
while l<r:
 best=max(best,(r-l)*min(a[l],a[r]))
 if a[l]<=a[r]:l+=1
 else:r-=1
print(best)''',
 [_cm_array([1,8,6,2,5,4,8,3,7]),_cm_array([1,1]),_cm_array([0,0,0]),_cm_array([9,1,1,9]),_cm_array([1,2,3,4,5]),_cm_array([1000000000]*10000)], ['49','1'])

add('curated-product-of-array-except-self', 'Product of Array Except Self', 'Arrays', 'Medium',
 'For each array position, compute the product of every input value except the value at that position. Solve the problem without division, including when the input contains zeros.',
 'n, followed by n integers.', 'Print n products in the original position order, separated by spaces.',
 ['2 <= n <= 2000', '-10 <= value <= 10', 'Every contiguous product and every requested output fits in a signed 64-bit integer.'],
 'Store the product strictly to the left of each position. Scan backward with a running product strictly to the right and multiply it into the stored answer.',
 'O(n) time, O(n) output space and O(1) auxiliary space beyond input/output.',
 ['One zero and two zeros lead to different answers.', 'Use 1 as the product of an empty prefix or suffix.'],
 '''int n=f.i();long[]a=new long[n],out=new long[n];for(int i=0;i<n;i++)a[i]=f.l();long product=1;for(int i=0;i<n;i++){out[i]=product;product*=a[i];}product=1;for(int i=n-1;i>=0;i--){out[i]*=product;product*=a[i];}StringBuilder s=new StringBuilder();for(long x:out)s.append(x).append(' ');System.out.println(s);''',
 '''int n;cin>>n;vector<long long>a(n),out(n);for(auto&x:a)cin>>x;long long product=1;for(int i=0;i<n;i++){out[i]=product;product*=a[i];}product=1;for(int i=n-1;i>=0;i--){out[i]*=product;product*=a[i];}for(auto x:out)cout<<x<<' ';''',
 '''n=ni();a=[ni() for _ in range(n)];out=[1]*n;product=1
for i in range(n):out[i]=product;product*=a[i]
product=1
for i in range(n-1,-1,-1):out[i]*=product;product*=a[i]
print(*out)''',
 [_cm_array([1,2,3,4]),_cm_array([-1,1,0,-3,3]),_cm_array([0,0,5]),_cm_array([-2,-3]),_cm_array([-1,-1,-1,-1]),_cm_array([10]*15),_cm_array([1]*2000)], ['24 12 8 6','0 0 9 0 0'])

add('curated-top-k-frequent-elements', 'Top K Frequent Elements', 'Hashing', 'Medium',
 'Return the k distinct values that occur most often in an array. The input guarantees that the selected set is unique: if any values are excluded, every selected value occurs more often than every excluded value.',
 'n and k, followed by n integers.', 'Print the k selected values in any order, with no count prefix.',
 ['1 <= n <= 200000', '1 <= k <= min(2000, number of distinct values)', '-1000000000 <= value <= 1000000000', 'No frequency tie crosses the selection boundary.'],
 'Count each value with a hash map, sort the distinct values by decreasing count, and return the first k. A value tie-breaker makes the reference output reproducible but is not required.',
 'O(n+d log d) expected time, O(d) space, where d is the number of distinct values.',
 ['Rank distinct values, not individual occurrences.', 'Equal frequencies within the selected set are permitted.'],
 '''int n=f.i(),k=f.i();Map<Integer,Integer>counts=new HashMap<>();for(int i=0;i<n;i++){int x=f.i();counts.put(x,counts.getOrDefault(x,0)+1);}List<Integer>values=new ArrayList<>(counts.keySet());values.sort((a,b)->{int c=Integer.compare(counts.get(b),counts.get(a));return c!=0?c:Integer.compare(a,b);});for(int i=0;i<k;i++)System.out.print(values.get(i)+" ");''',
 '''int n,k;cin>>n>>k;unordered_map<int,int>counts;for(int i=0,x;i<n;i++){cin>>x;counts[x]++;}vector<int>values;for(auto item:counts)values.push_back(item.first);sort(values.begin(),values.end(),[&](int a,int b){return counts[a]!=counts[b]?counts[a]>counts[b]:a<b;});for(int i=0;i<k;i++)cout<<values[i]<<' ';''',
 '''n=ni();k=ni();counts=Counter(ni() for _ in range(n));values=sorted(counts,key=lambda x:(-counts[x],x));print(*values[:k])''',
 [_cm_array([1,1,1,2,2,3],2),_cm_array([4,-1,4,-1,9],2),_cm_array([5],1),_cm_array([0,0,0,2],1),_cm_array([-2,-1,0],3),_cm_array([7]*10000+[8]*3000+[9],2)], ['1 2','-1 4'], checker='TOKEN_MULTISET')

add('curated-longest-consecutive-sequence', 'Longest Consecutive Sequence', 'Hashing', 'Medium',
 'Find the length of the longest run of consecutive integer values present anywhere in the array. Their positions do not have to be adjacent or in order, and duplicates do not extend a run.',
 'n, followed by n integers. n may be zero.', 'Print the longest run length; print 0 for an empty array.',
 ['0 <= n <= 200000', '-1000000000 <= value <= 1000000000'],
 'Put the values in a set. Only start counting at a value whose predecessor is absent, then advance through its consecutive successors. Each distinct value belongs to just one counted run.',
 'O(n) expected time, O(n) space.',
 ['Starting a scan at every value can repeat the same work.', 'A run starts at x exactly when x-1 is absent.'],
 '''int n=f.i();Set<Integer>values=new HashSet<>();for(int i=0;i<n;i++)values.add(f.i());int best=0;for(int x:values)if(!values.contains(x-1)){int end=x;while(values.contains(end))end++;best=Math.max(best,end-x);}System.out.println(best);''',
 '''int n;cin>>n;unordered_set<int>values;for(int i=0,x;i<n;i++){cin>>x;values.insert(x);}int best=0;for(int x:values)if(!values.count(x-1)){int end=x;while(values.count(end))end++;best=max(best,end-x);}cout<<best;''',
 '''n=ni();values={ni() for _ in range(n)};best=0
for x in values:
 if x-1 not in values:
  end=x
  while end in values:end+=1
  best=max(best,end-x)
print(best)''',
 [_cm_array([100,4,200,1,3,2]),_cm_array([0,3,7,2,5,8,4,6,0,1]),_cm_array([]),_cm_array([8,8,8]),_cm_array([-2,-1,0,2]),_cm_array([1000000000,-1000000000]),_cm_array(list(range(9999,-1,-1)))], ['4','9'])

add('curated-search-in-rotated-sorted-array', 'Search in Rotated Sorted Array', 'Binary search', 'Medium',
 'An array was strictly increasing, then rotated by moving a prefix to its end, possibly moving no elements. Find the position of a target value in the rotated array.',
 'n and target, followed by n distinct integers.', 'Print the zero-based target index, or -1 if the target is absent.',
 ['1 <= n <= 200000', '-1000000000 <= values,target <= 1000000000', 'The array is a rotation of a strictly increasing array.'],
 'At every binary-search step, at least one half is sorted. Check whether the target lies inside that sorted half and retain the appropriate half.',
 'O(log n) search time after O(n) input reading; O(1) auxiliary space beyond the input.',
 ['Identify a sorted half before discarding indices.', 'The target may lie on either side of the rotation pivot.'],
 '''int n=f.i(),target=f.i();int[]a=new int[n];for(int i=0;i<n;i++)a[i]=f.i();int l=0,r=n-1,answer=-1;while(l<=r){int m=l+(r-l)/2;if(a[m]==target){answer=m;break;}if(a[l]<=a[m]){if(a[l]<=target&&target<a[m])r=m-1;else l=m+1;}else{if(a[m]<target&&target<=a[r])l=m+1;else r=m-1;}}System.out.println(answer);''',
 '''int n,target;cin>>n>>target;vector<int>a(n);for(int&x:a)cin>>x;int l=0,r=n-1,answer=-1;while(l<=r){int m=l+(r-l)/2;if(a[m]==target){answer=m;break;}if(a[l]<=a[m]){if(a[l]<=target&&target<a[m])r=m-1;else l=m+1;}else{if(a[m]<target&&target<=a[r])l=m+1;else r=m-1;}}cout<<answer;''',
 '''n=ni();target=ni();a=[ni() for _ in range(n)];l=0;r=n-1;answer=-1
while l<=r:
 m=(l+r)//2
 if a[m]==target:answer=m;break
 if a[l]<=a[m]:
  if a[l]<=target<a[m]:r=m-1
  else:l=m+1
 else:
  if a[m]<target<=a[r]:l=m+1
  else:r=m-1
print(answer)''',
 [_cm_array([4,5,6,7,0,1,2],0),_cm_array([4,5,6,7,0,1,2],3),_cm_array([1],1),_cm_array([1],0),_cm_array([1,2,3,4],4),_cm_array([3,1],1),_cm_array(list(range(7000,10000))+list(range(7000)),6999)], ['4','-1'])

add('curated-find-minimum-in-rotated-sorted-array', 'Find Minimum in Rotated Sorted Array', 'Binary search', 'Medium',
 'A strictly increasing array has been rotated, possibly by zero positions. Find its minimum value without restoring the entire sorted order.',
 'n, followed by n distinct integers forming a rotation of a strictly increasing array.', 'Print the minimum value.',
 ['1 <= n <= 200000', '-1000000000 <= value <= 1000000000'],
 'Compare the middle value with the rightmost value. If the middle is larger, the minimum lies strictly to its right; otherwise the middle might be the minimum, so retain it.',
 'O(log n) search time after O(n) input reading; O(1) auxiliary space beyond the input.',
 ['An unrotated array is a valid input.', 'When a[mid] <= a[right], use right = mid rather than mid - 1.'],
 '''int n=f.i();int[]a=new int[n];for(int i=0;i<n;i++)a[i]=f.i();int l=0,r=n-1;while(l<r){int m=l+(r-l)/2;if(a[m]>a[r])l=m+1;else r=m;}System.out.println(a[l]);''',
 '''int n;cin>>n;vector<int>a(n);for(int&x:a)cin>>x;int l=0,r=n-1;while(l<r){int m=l+(r-l)/2;if(a[m]>a[r])l=m+1;else r=m;}cout<<a[l];''',
 '''n=ni();a=[ni() for _ in range(n)];l=0;r=n-1
while l<r:
 m=(l+r)//2
 if a[m]>a[r]:l=m+1
 else:r=m
print(a[l])''',
 [_cm_array([3,4,5,1,2]),_cm_array([4,5,6,7,0,1,2]),_cm_array([9]),_cm_array([-5,-2,0,8]),_cm_array([2,1]),_cm_array([0,4,-9,-3]),_cm_array(list(range(1,10000))+[0])], ['1','0'])

add('curated-merge-intervals', 'Merge Intervals', 'Intervals', 'Medium',
 'Combine overlapping closed intervals into disjoint closed intervals with the same covered points. Intervals that touch at an endpoint overlap. Input intervals may be unsorted, nested or repeated.',
 'n, followed by n lines containing start and end.',
 'Print the merged interval count, then one start end pair per line in increasing start order.',
 ['0 <= n <= 1500', '-1000000000 <= start <= end <= 1000000000'],
 'Sort by start. If the next interval starts at or before the current end, extend that end; otherwise begin a new result interval.',
 'O(n log n) time, O(n) space including the result.',
 ['Use <= when deciding whether closed intervals overlap.', 'An interval contained in the current interval must not reduce its end.'],
 '''int n=f.i();int[][]a=new int[n][2];for(int i=0;i<n;i++){a[i][0]=f.i();a[i][1]=f.i();}Arrays.sort(a,Comparator.comparingInt(x->x[0]));List<int[]>out=new ArrayList<>();for(int[]row:a){if(out.isEmpty()||row[0]>out.get(out.size()-1)[1])out.add(row.clone());else out.get(out.size()-1)[1]=Math.max(out.get(out.size()-1)[1],row[1]);}System.out.println(out.size());for(int[]row:out)System.out.println(row[0]+" "+row[1]);''',
 '''int n;cin>>n;vector<pair<int,int>>a(n),out;for(auto&row:a)cin>>row.first>>row.second;sort(a.begin(),a.end());for(auto row:a){if(out.empty()||row.first>out.back().second)out.push_back(row);else out.back().second=max(out.back().second,row.second);}cout<<out.size()<<'\n';for(auto row:out)cout<<row.first<<' '<<row.second<<'\n';'''.replace("'\n'", "'\\n'"),
 '''n=ni();a=sorted((ni(),ni()) for _ in range(n));out=[]
for left,right in a:
 if not out or left>out[-1][1]:out.append([left,right])
 else:out[-1][1]=max(out[-1][1],right)
print(len(out))
for row in out:print(*row)''',
 ['4\n1 3\n2 6\n8 10\n15 18\n','2\n1 4\n4 5\n','0\n','4\n5 5\n1 10\n2 3\n1 10\n','3\n-5 -3\n-2 0\n1 1\n','1500\n'+''.join(f'{2*i} {2*i+1}\n' for i in range(1500))], ['3\n1 6\n8 10\n15 18','1\n1 5'])

add('curated-insert-interval', 'Insert Interval', 'Intervals', 'Medium',
 'Insert one closed interval into an already sorted collection of nonoverlapping closed intervals. Merge everything that overlaps, including intervals that meet at an endpoint.',
 'n, then n start end pairs in increasing start order, then the new interval start end pair.',
 'Print the resulting interval count, then one start end pair per line in increasing start order.',
 ['0 <= n <= 1500', '-1000000000 <= every start <= its end <= 1000000000', 'For existing neighbors, previous end < next start.'],
 'Copy intervals strictly before the new interval. Expand the new interval across every overlapping interval, append the expansion, then copy all remaining intervals.',
 'O(n) time, O(n) space including the result.',
 ['The inserted interval can absorb several existing intervals.', 'Distinguish intervals strictly before, overlapping, and strictly after.'],
 '''int n=f.i();int[][]a=new int[n][2];for(int i=0;i<n;i++){a[i][0]=f.i();a[i][1]=f.i();}int left=f.i(),right=f.i(),i=0;List<int[]>out=new ArrayList<>();while(i<n&&a[i][1]<left)out.add(a[i++]);while(i<n&&a[i][0]<=right){left=Math.min(left,a[i][0]);right=Math.max(right,a[i][1]);i++;}out.add(new int[]{left,right});while(i<n)out.add(a[i++]);System.out.println(out.size());for(int[]row:out)System.out.println(row[0]+" "+row[1]);''',
 '''int n;cin>>n;vector<pair<int,int>>a(n),out;for(auto&row:a)cin>>row.first>>row.second;int left,right,i=0;cin>>left>>right;while(i<n&&a[i].second<left)out.push_back(a[i++]);while(i<n&&a[i].first<=right){left=min(left,a[i].first);right=max(right,a[i].second);i++;}out.push_back({left,right});while(i<n)out.push_back(a[i++]);cout<<out.size()<<'\n';for(auto row:out)cout<<row.first<<' '<<row.second<<'\n';'''.replace("'\n'", "'\\n'"),
 '''n=ni();a=[(ni(),ni()) for _ in range(n)];left=ni();right=ni();i=0;out=[]
while i<n and a[i][1]<left:out.append(a[i]);i+=1
while i<n and a[i][0]<=right:left=min(left,a[i][0]);right=max(right,a[i][1]);i+=1
out.append((left,right));out.extend(a[i:]);print(len(out))
for row in out:print(*row)''',
 ['2\n1 3\n6 9\n2 5\n','5\n1 2\n3 5\n6 7\n8 10\n12 16\n4 8\n','0\n2 4\n','2\n2 3\n5 8\n-2 0\n','1\n1 9\n3 4\n','3\n1 2\n4 5\n7 8\n2 7\n','1500\n'+''.join(f'{3*i} {3*i+1}\n' for i in range(1500))+'-1 5000\n'], ['2\n1 5\n6 9','3\n1 2\n3 10\n12 16'])

add('curated-jump-game', 'Jump Game', 'Greedy', 'Medium',
 'You start at index 0. From position i you may jump forward by any positive number of positions up to a[i]. Decide whether the last position can be reached. Starting on the last position already succeeds.',
 'n, followed by n nonnegative maximum jump lengths.', 'Print YES if the last position is reachable; otherwise print NO.',
 ['1 <= n <= 200000', '0 <= a[i] <= 200000'],
 'Scan only reachable positions while tracking the farthest index reachable so far. Extend that boundary with i+a[i]. If an index lies beyond the boundary, later positions cannot help.',
 'O(n) time, O(n) input space and O(1) auxiliary space.',
 ['You can jump less than a[i].', 'A zero blocks progress only when no earlier jump can pass it.'],
 '''int n=f.i();int[]a=new int[n];for(int i=0;i<n;i++)a[i]=f.i();int far=0;for(int i=0;i<n&&i<=far;i++)far=Math.max(far,i+a[i]);System.out.println(far>=n-1?"YES":"NO");''',
 '''int n;cin>>n;vector<int>a(n);for(int&x:a)cin>>x;int far=0;for(int i=0;i<n&&i<=far;i++)far=max(far,i+a[i]);cout<<(far>=n-1?"YES":"NO");''',
 '''n=ni();a=[ni() for _ in range(n)];far=0
for i,x in enumerate(a):
 if i>far:break
 far=max(far,i+x)
print('YES' if far>=n-1 else 'NO')''',
 [_cm_array([2,3,1,1,4]),_cm_array([3,2,1,0,4]),_cm_array([0]),_cm_array([0,1]),_cm_array([2,0,0]),_cm_array([1,0,2]),_cm_array([1]*20000)], ['YES','NO'])

add('curated-house-robber', 'House Robber', 'Dynamic programming', 'Medium',
 'A line of houses contains nonnegative amounts of money. Choose houses with maximum total money subject to the rule that two neighboring houses cannot both be chosen. Choosing no houses is allowed.',
 'n, followed by n amounts.', 'Print the maximum total as a 64-bit integer.',
 ['1 <= n <= 200000', '0 <= amount <= 1000000000'],
 'For each house, compare skipping it with taking it plus the best total ending before its neighbor. Keep only the previous two prefix optima.',
 'O(n) time, O(1) auxiliary space.',
 ['The largest individual house does not determine the best set.', 'Use a 64-bit total for many large amounts.'],
 '''int n=f.i();long twoBack=0,oneBack=0;for(int i=0;i<n;i++){long amount=f.l(),best=Math.max(oneBack,twoBack+amount);twoBack=oneBack;oneBack=best;}System.out.println(oneBack);''',
 '''int n;cin>>n;long long twoBack=0,oneBack=0;for(int i=0;i<n;i++){long long amount;cin>>amount;long long best=max(oneBack,twoBack+amount);twoBack=oneBack;oneBack=best;}cout<<oneBack;''',
 '''n=ni();two_back=one_back=0
for _ in range(n):two_back,one_back=one_back,max(one_back,two_back+ni())
print(one_back)''',
 [_cm_array([1,2,3,1]),_cm_array([2,7,9,3,1]),_cm_array([0]),_cm_array([9,2]),_cm_array([2,1,1,2]),_cm_array([0,0,0,0]),_cm_array([1000000000]*10000)], ['4','12'])

add('curated-coin-change', 'Coin Change', 'Dynamic programming', 'Medium',
 'You have an unlimited supply of each listed coin denomination. Find the fewest coins needed to make exactly the target amount. Report failure if no combination reaches the target.',
 'n and amount, followed by n distinct positive coin denominations.', 'Print the minimum coin count, or -1 if impossible. Amount 0 requires 0 coins.',
 ['1 <= n <= 100', '0 <= amount <= 10000', '1 <= denomination <= 10000'],
 'Let dp[x] be the minimum coins needed for x. Initialize dp[0] to zero and all other entries as unreachable. For each amount, try each denomination as its final coin.',
 'O(n * amount) time, O(amount+n) space.',
 ['Always choosing the largest available coin can fail.', 'An unreachable smaller amount must not create a valid larger amount.'],
 '''int n=f.i(),amount=f.i();int[]coins=new int[n],dp=new int[amount+1];for(int i=0;i<n;i++)coins[i]=f.i();Arrays.fill(dp,amount+1);dp[0]=0;for(int x=1;x<=amount;x++)for(int coin:coins)if(coin<=x)dp[x]=Math.min(dp[x],dp[x-coin]+1);System.out.println(dp[amount]>amount?-1:dp[amount]);''',
 '''int n,amount;cin>>n>>amount;vector<int>coins(n),dp(amount+1,amount+1);for(int&x:coins)cin>>x;dp[0]=0;for(int x=1;x<=amount;x++)for(int coin:coins)if(coin<=x)dp[x]=min(dp[x],dp[x-coin]+1);cout<<(dp[amount]>amount?-1:dp[amount]);''',
 '''n=ni();amount=ni();coins=[ni() for _ in range(n)];dp=[amount+1]*(amount+1);dp[0]=0
for x in range(1,amount+1):
 for coin in coins:
  if coin<=x:dp[x]=min(dp[x],dp[x-coin]+1)
print(dp[amount] if dp[amount]<=amount else -1)''',
 [_cm_array([1,2,5],11),_cm_array([2],3),_cm_array([2,5],0),_cm_array([1,3,4],6),_cm_array([7,11],1),_cm_array([2,3],7),_cm_array([1,7,31],10000)], ['3','-1'])

add('curated-longest-increasing-subsequence', 'Longest Increasing Subsequence', 'Dynamic programming', 'Medium',
 'Find the maximum length of a strictly increasing subsequence. A subsequence preserves input order but may skip positions. Equal neighboring values in the chosen subsequence are not allowed.',
 'n, followed by n integers. n may be zero.', 'Print the maximum length, or 0 for empty input.',
 ['0 <= n <= 200000', '-1000000000 <= value <= 1000000000'],
 'Maintain tails[length-1], the smallest ending value found for a subsequence of each length. Binary-search the first tail at least as large as the next value and replace it, or append when no such tail exists.',
 'O(n log n) time, O(n) space.',
 ['Replacing a tail improves future choices without changing its subsequence length.', 'Use lower_bound / bisect_left so duplicates do not extend a sequence.'],
 '''int n=f.i(),size=0;int[]tails=new int[n];for(int i=0;i<n;i++){int x=f.i(),l=0,r=size;while(l<r){int m=l+(r-l)/2;if(tails[m]<x)l=m+1;else r=m;}tails[l]=x;if(l==size)size++;}System.out.println(size);''',
 '''int n;cin>>n;vector<int>tails;for(int i=0,x;i<n;i++){cin>>x;auto it=lower_bound(tails.begin(),tails.end(),x);if(it==tails.end())tails.push_back(x);else *it=x;}cout<<tails.size();''',
 '''n=ni();tails=[]
for _ in range(n):
 x=ni();i=bisect_left(tails,x)
 if i==len(tails):tails.append(x)
 else:tails[i]=x
print(len(tails))''',
 [_cm_array([10,9,2,5,3,7,101,18]),_cm_array([0,1,0,3,2,3]),_cm_array([]),_cm_array([7,7,7,7]),_cm_array([4,3,2,1]),_cm_array([-3,-1,-2,0,1]),_cm_array(list(range(10000)))], ['4','4'])

add('curated-word-break', 'Word Break', 'Dynamic programming', 'Medium',
 'Decide whether a string can be split into one or more dictionary words so that every character is used exactly once in order. You may reuse a dictionary word any number of times.',
 'The string s, then m, then m distinct dictionary words. All strings are nonempty lowercase English words; m may be zero.',
 'Print YES if a valid split exists; otherwise print NO.',
 ['1 <= length(s) <= 1000', '0 <= m <= 1000', '1 <= dictionary word length <= 30'],
 'Let dp[i] mean that the first i characters can be split. From each end position, check preceding reachable boundaries up to the longest dictionary word length away.',
 'O(S*L^2+D) time including substring creation/hashing, O(S+D) space; S is string length, L is maximum word length, D is dictionary character count.',
 ['The same word can be used multiple times.', 'A greedy split at the first matching word can miss a valid decomposition.'],
 '''String s=f.next();int m=f.i(),maxLen=0;Set<String>words=new HashSet<>();for(int i=0;i<m;i++){String word=f.next();words.add(word);maxLen=Math.max(maxLen,word.length());}boolean[]dp=new boolean[s.length()+1];dp[0]=true;for(int end=1;end<=s.length();end++)for(int start=Math.max(0,end-maxLen);start<end;start++)if(dp[start]&&words.contains(s.substring(start,end))){dp[end]=true;break;}System.out.println(dp[s.length()]?"YES":"NO");''',
 '''string s;int m;cin>>s>>m;unordered_set<string>words;int maxLen=0;for(int i=0;i<m;i++){string word;cin>>word;words.insert(word);maxLen=max(maxLen,(int)word.size());}vector<bool>dp(s.size()+1);dp[0]=true;for(int end=1;end<=(int)s.size();end++)for(int start=max(0,end-maxLen);start<end;start++)if(dp[start]&&words.count(s.substr(start,end-start))){dp[end]=true;break;}cout<<(dp[s.size()]?"YES":"NO");''',
 '''s=next(data);m=ni();words={next(data) for _ in range(m)};max_len=max(map(len,words),default=0);dp=[False]*(len(s)+1);dp[0]=True
for end in range(1,len(s)+1):
 for start in range(max(0,end-max_len),end):
  if dp[start] and s[start:end] in words:dp[end]=True;break
print('YES' if dp[-1] else 'NO')''',
 ['leetcode\n2\nleet code\n','catsandog\n5\ncats dog sand and cat\n','applepenapple\n2\napple pen\n','a\n0\n','aaaaaaa\n2\naaaa aaa\n','ab\n2\na abc\n','a'*999+'b\n3\na aa aaa\n'], ['YES','NO'])

add('curated-permutations', 'Permutations', 'Backtracking', 'Medium',
 'List every arrangement of the input values. All input values are distinct, and every arrangement must use every value exactly once.',
 'n, followed by n distinct integers.',
 'Print n! on the first line, then one permutation per line containing exactly n values. The permutation lines may appear in any order; order within a line identifies that permutation.',
 ['1 <= n <= 6', '-100 <= value <= 100'],
 'Build one permutation from left to right. At each step choose an unused input value, recurse, and then undo that choice. Save a copy when all n positions have been filled.',
 'O(n*n!) time and output space, with O(n) recursion state beyond stored output.',
 ['A used-position array prevents choosing one input twice.', 'Undo both the path append and the used flag when returning.'],
 '''int n=f.i();int[]a=new int[n];for(int i=0;i<n;i++)a[i]=f.i();class Search{boolean[]used=new boolean[n];int[]path=new int[n];List<int[]>out=new ArrayList<>();void visit(int depth){if(depth==n){out.add(path.clone());return;}for(int i=0;i<n;i++)if(!used[i]){used[i]=true;path[depth]=a[i];visit(depth+1);used[i]=false;}}}Search search=new Search();search.visit(0);System.out.println(search.out.size());for(int[]row:search.out){for(int x:row)System.out.print(x+" ");System.out.println();}''',
 '''int n;cin>>n;vector<int>a(n),path;vector<bool>used(n);vector<vector<int>>out;for(int&x:a)cin>>x;auto visit=[&](auto&&self)->void{if((int)path.size()==n){out.push_back(path);return;}for(int i=0;i<n;i++)if(!used[i]){used[i]=true;path.push_back(a[i]);self(self);path.pop_back();used[i]=false;}};visit(visit);cout<<out.size()<<'\n';for(auto&row:out){for(int x:row)cout<<x<<' ';cout<<'\n';}'''.replace("'\n'", "'\\n'"),
 '''n=ni();a=[ni() for _ in range(n)];used=[False]*n;path=[];out=[]
def visit():
 if len(path)==n:out.append(path.copy());return
 for i in range(n):
  if not used[i]:
   used[i]=True;path.append(a[i]);visit();path.pop();used[i]=False
visit();print(len(out))
for row in out:print(*row)''',
 [_cm_array([1,2,3]),_cm_array([0,1]),_cm_array([-5]),_cm_array([3,-1,0]),_cm_array([4,3,2,1]),_cm_array([-100,-50,0,50,99,100])],
 ['6\n1 2 3\n1 3 2\n2 1 3\n2 3 1\n3 1 2\n3 2 1','2\n0 1\n1 0'], checker='UNORDERED_LINES')

add('curated-subsets', 'Subsets', 'Backtracking', 'Medium',
 'Generate every subset of a collection of distinct integers, including the empty subset and the entire collection. Each subset must appear exactly once.',
 'n, followed by n distinct integers. n may be zero.',
 'Print the subset count. Then print one subset per line as its size followed by its values in strictly increasing order. The empty subset is a line containing 0. Subset lines may appear in any order.',
 ['0 <= n <= 10', '-100 <= value <= 100'],
 'Sort the values, then enumerate all n-bit masks. Include value i when bit i is set. Sorted input makes every printed subset increase without changing which subsets exist.',
 'O(n*2^n) time, O(n) auxiliary space when printing subsets as they are generated.',
 ['There are exactly 2^n subsets for n distinct values.', 'The all-zero mask represents the empty subset.'],
 '''int n=f.i();int[]a=new int[n];for(int i=0;i<n;i++)a[i]=f.i();Arrays.sort(a);System.out.println(1<<n);for(int mask=0;mask<(1<<n);mask++){StringBuilder row=new StringBuilder().append(Integer.bitCount(mask));for(int i=0;i<n;i++)if((mask&(1<<i))!=0)row.append(' ').append(a[i]);System.out.println(row);}''',
 '''int n;cin>>n;vector<int>a(n);for(int&x:a)cin>>x;sort(a.begin(),a.end());cout<<(1<<n)<<'\n';for(int mask=0;mask<(1<<n);mask++){int count=0;for(int i=0;i<n;i++)if(mask&(1<<i))count++;cout<<count;for(int i=0;i<n;i++)if(mask&(1<<i))cout<<' '<<a[i];cout<<'\n';}'''.replace("'\n'", "'\\n'"),
 '''n=ni();a=sorted(ni() for _ in range(n));print(1<<n)
for mask in range(1<<n):
 row=[a[i] for i in range(n) if mask&(1<<i)];print(len(row),*row)''',
 [_cm_array([1,2,3]),_cm_array([0]),_cm_array([]),_cm_array([3,1]),_cm_array([-5,0,5]),_cm_array(list(range(-5,5)))],
 ['8\n0\n1 1\n1 2\n2 1 2\n1 3\n2 1 3\n2 2 3\n3 1 2 3','2\n0\n1 0'], checker='UNORDERED_LINES')

add('curated-combination-sum', 'Combination Sum', 'Backtracking', 'Medium',
 'Find every distinct combination of candidate values whose sum is exactly target. Each candidate may be chosen any number of times. Combinations differing only in order are the same combination.',
 'n and target, followed by n distinct positive candidate values.',
 'Print the combination count, then one combination per line as its length followed by its values in nondecreasing order. Combination lines may appear in any order. Print only 0 if no combination exists.',
 ['1 <= n <= 20', '1 <= target <= 30', '1 <= candidate <= 30', 'The input produces at most 500 combinations.'],
 'Sort candidates and backtrack with a remaining sum and a minimum allowed candidate index. Reusing the current index permits repeated use, while never moving to a smaller index prevents reordered duplicates.',
 'O(n^(target/minCandidate+1)) conservative search-time bound, O(target/minCandidate) recursion state plus output storage.',
 ['After choosing candidate i, it remains available for the next choice.', 'Positive candidates let you stop when a value exceeds the remaining sum.'],
 '''int n=f.i(),target=f.i();int[]a=new int[n];for(int i=0;i<n;i++)a[i]=f.i();Arrays.sort(a);class Search{List<Integer>path=new ArrayList<>();List<List<Integer>>out=new ArrayList<>();void visit(int start,int remaining){if(remaining==0){out.add(new ArrayList<>(path));return;}for(int i=start;i<n&&a[i]<=remaining;i++){path.add(a[i]);visit(i,remaining-a[i]);path.remove(path.size()-1);}}}Search search=new Search();search.visit(0,target);System.out.println(search.out.size());for(List<Integer>row:search.out){System.out.print(row.size());for(int x:row)System.out.print(" "+x);System.out.println();}''',
 '''int n,target;cin>>n>>target;vector<int>a(n),path;vector<vector<int>>out;for(int&x:a)cin>>x;sort(a.begin(),a.end());auto visit=[&](auto&&self,int start,int remaining)->void{if(remaining==0){out.push_back(path);return;}for(int i=start;i<n&&a[i]<=remaining;i++){path.push_back(a[i]);self(self,i,remaining-a[i]);path.pop_back();}};visit(visit,0,target);cout<<out.size()<<'\n';for(auto&row:out){cout<<row.size();for(int x:row)cout<<' '<<x;cout<<'\n';}'''.replace("'\n'", "'\\n'"),
 '''n=ni();target=ni();a=sorted(ni() for _ in range(n));path=[];out=[]
def visit(start,remaining):
 if remaining==0:out.append(path.copy());return
 for i in range(start,n):
  if a[i]>remaining:break
  path.append(a[i]);visit(i,remaining-a[i]);path.pop()
visit(0,target);print(len(out))
for row in out:print(len(row),*row)''',
 [_cm_array([2,3,6,7],7),_cm_array([2,3,5],8),_cm_array([2],1),_cm_array([1],30),_cm_array([8,3,2],6),_cm_array([2,4,6,8,10],30)],
 ['2\n3 2 2 3\n1 7','3\n4 2 2 2 2\n3 2 3 3\n2 3 5'], checker='UNORDERED_LINES')

add('curated-number-of-islands', 'Number of Islands', 'Graphs', 'Medium',
 'Count connected regions of land in a rectangular map. A 1 is land and a 0 is water. Land cells connect horizontally or vertically, never diagonally, and cells outside the map are water.',
 'rows and columns, followed by rows binary strings, each with exactly columns characters.', 'Print the number of islands.',
 ['1 <= rows,columns <= 200'],
 'Scan all cells. Each unvisited land cell starts a new island; flood-fill it with an explicit queue, marking cells when they enter the queue so none enters twice.',
 'O(rows*columns) time and space.',
 ['Diagonal contacts do not connect islands.', 'An iterative traversal handles a large island without a deep call stack.'],
 '''int rows=f.i(),cols=f.i();char[][]grid=new char[rows][];for(int i=0;i<rows;i++)grid[i]=f.next().toCharArray();int islands=0;int[]dr={1,-1,0,0},dc={0,0,1,-1};ArrayDeque<Integer>q=new ArrayDeque<>();for(int r=0;r<rows;r++)for(int c=0;c<cols;c++)if(grid[r][c]=='1'){islands++;grid[r][c]='0';q.add(r*cols+c);while(!q.isEmpty()){int p=q.remove(),x=p/cols,y=p%cols;for(int k=0;k<4;k++){int u=x+dr[k],v=y+dc[k];if(u>=0&&u<rows&&v>=0&&v<cols&&grid[u][v]=='1'){grid[u][v]='0';q.add(u*cols+v);}}}}System.out.println(islands);''',
 '''int rows,cols;cin>>rows>>cols;vector<string>grid(rows);for(auto&row:grid)cin>>row;int islands=0,dr[]={1,-1,0,0},dc[]={0,0,1,-1};queue<pair<int,int>>q;for(int r=0;r<rows;r++)for(int c=0;c<cols;c++)if(grid[r][c]=='1'){islands++;grid[r][c]='0';q.push({r,c});while(!q.empty()){auto[x,y]=q.front();q.pop();for(int k=0;k<4;k++){int u=x+dr[k],v=y+dc[k];if(u>=0&&u<rows&&v>=0&&v<cols&&grid[u][v]=='1'){grid[u][v]='0';q.push({u,v});}}}}cout<<islands;''',
 '''rows=ni();cols=ni();grid=[list(next(data)) for _ in range(rows)];islands=0
for r in range(rows):
 for c in range(cols):
  if grid[r][c]!='1':continue
  islands+=1;grid[r][c]='0';q=deque([(r,c)])
  while q:
   x,y=q.popleft()
   for u,v in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
    if 0<=u<rows and 0<=v<cols and grid[u][v]=='1':grid[u][v]='0';q.append((u,v))
print(islands)''',
 ['4 5\n11110\n11010\n11000\n00000\n','4 5\n11000\n11000\n00100\n00011\n','1 1\n0\n','1 1\n1\n','3 3\n101\n010\n101\n','1 7\n1010101\n','200 200\n'+('1'*200+'\n')*200], ['1','3'])

add('curated-rotting-oranges', 'Rotting Oranges', 'Graphs', 'Medium',
 'A grid cell is empty (0), contains a fresh orange (1), or contains a rotten orange (2). Each minute every rotten orange simultaneously rots its fresh horizontal and vertical neighbors. Find the earliest minute when no fresh orange remains.',
 'rows and columns, followed by rows*columns integers in row order.',
 'Print the required minutes, 0 if there are no fresh oranges initially, or -1 if any fresh orange can never rot.',
 ['1 <= rows,columns <= 200', 'Every grid value is 0, 1, or 2.'],
 'Start breadth-first search from all initially rotten oranges together. One queue layer is one minute. Count remaining fresh oranges and mark each one rotten when it is queued.',
 'O(rows*columns) time and space.',
 ['All initial rotten oranges act at time zero.', 'Empty cells block transmission; they do not become rotten.'],
 '''int rows=f.i(),cols=f.i(),fresh=0;int[][]grid=new int[rows][cols];ArrayDeque<Integer>q=new ArrayDeque<>();for(int r=0;r<rows;r++)for(int c=0;c<cols;c++){grid[r][c]=f.i();if(grid[r][c]==1)fresh++;else if(grid[r][c]==2)q.add(r*cols+c);}int minutes=0;int[]dr={1,-1,0,0},dc={0,0,1,-1};while(fresh>0&&!q.isEmpty()){int size=q.size();for(int i=0;i<size;i++){int p=q.remove(),r=p/cols,c=p%cols;for(int k=0;k<4;k++){int x=r+dr[k],y=c+dc[k];if(x>=0&&x<rows&&y>=0&&y<cols&&grid[x][y]==1){grid[x][y]=2;fresh--;q.add(x*cols+y);}}}minutes++;}System.out.println(fresh==0?minutes:-1);''',
 '''int rows,cols;cin>>rows>>cols;vector<vector<int>>grid(rows,vector<int>(cols));queue<pair<int,int>>q;int fresh=0;for(int r=0;r<rows;r++)for(int c=0;c<cols;c++){cin>>grid[r][c];if(grid[r][c]==1)fresh++;else if(grid[r][c]==2)q.push({r,c});}int minutes=0,dr[]={1,-1,0,0},dc[]={0,0,1,-1};while(fresh&&!q.empty()){int size=q.size();while(size--){auto[r,c]=q.front();q.pop();for(int k=0;k<4;k++){int x=r+dr[k],y=c+dc[k];if(x>=0&&x<rows&&y>=0&&y<cols&&grid[x][y]==1){grid[x][y]=2;fresh--;q.push({x,y});}}}minutes++;}cout<<(fresh==0?minutes:-1);''',
 '''rows=ni();cols=ni();grid=[[ni() for _ in range(cols)] for _ in range(rows)];q=deque();fresh=0
for r in range(rows):
 for c in range(cols):
  if grid[r][c]==1:fresh+=1
  elif grid[r][c]==2:q.append((r,c))
minutes=0
while fresh and q:
 for _ in range(len(q)):
  r,c=q.popleft()
  for x,y in ((r+1,c),(r-1,c),(r,c+1),(r,c-1)):
   if 0<=x<rows and 0<=y<cols and grid[x][y]==1:grid[x][y]=2;fresh-=1;q.append((x,y))
 minutes+=1
print(minutes if fresh==0 else -1)''',
 ['3 3\n2 1 1\n1 1 0\n0 1 1\n','3 3\n2 1 1\n0 1 1\n1 0 1\n','1 1\n0\n','1 1\n1\n','1 5\n2 1 1 1 2\n','2 2\n2 0\n0 2\n','200 200\n2 '+'1 '*39999+'\n'], ['4','-1'])

# The shared tree adapter consumes compact level order: only present nodes have
# child slots. It is deliberately iterative to support a long one-sided tree.
_cm_tree_input = ('First token: m, the number of tree tokens. Then m compact level-order tokens, each an integer or null. '
                  'The first token is the root; for each present node in queue order, consume its left then right child token. '
                  'Missing trailing child tokens are null. m=0 or the single token null denotes an empty tree. '
                  'The encoding is valid and contains no tokens after all child slots are exhausted.')
_cm_tree_java = '''int m=f.i();String[]tokens=new String[m];for(int i=0;i<m;i++)tokens[i]=f.next();long[]values=new long[m];int[]left=new int[m],right=new int[m];Arrays.fill(left,-1);Arrays.fill(right,-1);int root=m==0||tokens[0].equals("null")?-1:0;ArrayDeque<Integer>build=new ArrayDeque<>();if(root!=-1){values[0]=Long.parseLong(tokens[0]);build.add(0);}int position=1;while(!build.isEmpty()&&position<m){int parent=build.remove();for(int side=0;side<2&&position<m;side++,position++)if(!tokens[position].equals("null")){values[position]=Long.parseLong(tokens[position]);if(side==0)left[parent]=position;else right[parent]=position;build.add(position);}}
'''
_cm_tree_cpp = '''int m;cin>>m;vector<string>tokens(m);for(auto&token:tokens)cin>>token;vector<long long>values(m);vector<int>left(m,-1),right(m,-1);int root=m==0||tokens[0]=="null"?-1:0;queue<int>build;if(root!=-1){values[0]=stoll(tokens[0]);build.push(0);}int position=1;while(!build.empty()&&position<m){int parent=build.front();build.pop();for(int side=0;side<2&&position<m;side++,position++)if(tokens[position]!="null"){values[position]=stoll(tokens[position]);if(side==0)left[parent]=position;else right[parent]=position;build.push(position);}}
'''
_cm_tree_python = '''m=ni();tokens=[next(data) for _ in range(m)];values=[0]*m;left=[-1]*m;right=[-1]*m;root=-1 if not m or tokens[0]=='null' else 0;build=deque()
if root!=-1:values[0]=int(tokens[0]);build.append(0)
position=1
while build and position<m:
 parent=build.popleft()
 for side in range(2):
  if position==m:break
  if tokens[position]!='null':
   values[position]=int(tokens[position])
   if side==0:left[parent]=position
   else:right[parent]=position
   build.append(position)
  position+=1
'''

add('curated-binary-tree-level-order-traversal', 'Binary Tree Level Order Traversal', 'Trees', 'Medium',
 'Visit a binary tree one depth at a time, from the root downward. At each depth, list the present nodes from left to right; missing children contribute no output values.',
 _cm_tree_input,
 'Print the number of occupied levels. Then print one line per level as the number of nodes at that level followed by their values from left to right. An empty tree prints 0.',
 ['0 <= m <= 3000', '-2147483648 <= node value <= 2147483647'],
 'Parse the compact encoding into child links. Use breadth-first search, snapshotting the queue size before processing each level so newly queued children belong to the next level.',
 'O(m) time and space, including parsed input and output.',
 ['A null token has no child slots of its own.', 'Capture the queue size once at the start of each level.'],
 _cm_tree_java+'''ArrayDeque<Integer>q=new ArrayDeque<>();if(root!=-1)q.add(root);List<List<Long>>levels=new ArrayList<>();while(!q.isEmpty()){int size=q.size();List<Long>row=new ArrayList<>();for(int i=0;i<size;i++){int node=q.remove();row.add(values[node]);if(left[node]!=-1)q.add(left[node]);if(right[node]!=-1)q.add(right[node]);}levels.add(row);}System.out.println(levels.size());for(List<Long>row:levels){System.out.print(row.size());for(long value:row)System.out.print(" "+value);System.out.println();}''',
 _cm_tree_cpp+'''queue<int>q;if(root!=-1)q.push(root);vector<vector<long long>>levels;while(!q.empty()){int size=q.size();vector<long long>row;while(size--){int node=q.front();q.pop();row.push_back(values[node]);if(left[node]!=-1)q.push(left[node]);if(right[node]!=-1)q.push(right[node]);}levels.push_back(row);}cout<<levels.size()<<'\n';for(auto&row:levels){cout<<row.size();for(auto value:row)cout<<' '<<value;cout<<'\n';}'''.replace("'\n'", "'\\n'"),
 _cm_tree_python+'''q=deque([root] if root!=-1 else []);levels=[]
while q:
 row=[]
 for _ in range(len(q)):
  node=q.popleft();row.append(values[node])
  if left[node]!=-1:q.append(left[node])
  if right[node]!=-1:q.append(right[node])
 levels.append(row)
print(len(levels))
for row in levels:print(len(row),*row)''',
 ['7\n3 9 20 null null 15 7\n','0\n','1\nnull\n','1\n-2147483648\n','5\n1 null 2 3 4\n','7\n1 2 3 4 5 6 7\n',_cm_array([str(x) if x%2==0 else 'null' for x in range(1999)])],
 ['3\n1 3\n2 9 20\n2 15 7','0'])

add('curated-validate-binary-search-tree', 'Validate Binary Search Tree', 'Trees', 'Medium',
 'Determine whether a binary tree is a strict binary search tree: every value in a node\'s left subtree must be smaller than that node, and every value in its right subtree must be larger. Duplicate values violate this rule. An empty tree is valid.',
 _cm_tree_input, 'Print YES for a valid binary search tree; otherwise print NO.',
 ['0 <= m <= 200000', '-2147483648 <= node value <= 2147483647'],
 'An inorder traversal of a strict binary search tree is strictly increasing. Traverse iteratively with a stack and reject any value that is no larger than the preceding visited value.',
 'O(m) time and space including parsing; traversal uses O(h) additional stack space for height h.',
 ['Checking only direct children misses violations deeper in a subtree.', 'Track whether a previous value exists instead of reserving an input value as a sentinel.'],
 _cm_tree_java+'''ArrayDeque<Integer>stack=new ArrayDeque<>();int node=root;boolean valid=true,havePrevious=false;long previous=0;while(node!=-1||!stack.isEmpty()){while(node!=-1){stack.push(node);node=left[node];}node=stack.pop();if(havePrevious&&values[node]<=previous){valid=false;break;}previous=values[node];havePrevious=true;node=right[node];}System.out.println(valid?"YES":"NO");''',
 _cm_tree_cpp+'''vector<int>stack;int node=root;bool valid=true,havePrevious=false;long long previous=0;while(node!=-1||!stack.empty()){while(node!=-1){stack.push_back(node);node=left[node];}node=stack.back();stack.pop_back();if(havePrevious&&values[node]<=previous){valid=false;break;}previous=values[node];havePrevious=true;node=right[node];}cout<<(valid?"YES":"NO");''',
 _cm_tree_python+'''stack=[];node=root;previous=None;valid=True
while node!=-1 or stack:
 while node!=-1:stack.append(node);node=left[node]
 node=stack.pop()
 if previous is not None and values[node]<=previous:valid=False;break
 previous=values[node];node=right[node]
print('YES' if valid else 'NO')''',
 ['3\n2 1 3\n','7\n5 1 4 null null 3 6\n','0\n','3\n2 2 3\n','3\n0 -2147483648 2147483647\n','7\n10 5 15 null null 6 20\n',_cm_array([str(x) if x%2==0 else 'null' for x in range(19999)])], ['YES','NO'])

add('curated-kth-smallest-element-in-a-bst', 'Kth Smallest Element in a BST', 'Trees', 'Medium',
 'Given a nonempty strict binary search tree, return the kth smallest node value. k is one-based: k=1 requests the smallest value. All node values are distinct.',
 _cm_tree_input+' After the m tree tokens, read k.', 'Print the kth smallest value.',
 ['1 <= m <= 200000', 'The encoded tree is nonempty and is a valid strict binary search tree.', '1 <= k <= number of present nodes', '-2147483648 <= node value <= 2147483647'],
 'Perform an iterative inorder traversal, which visits BST values in increasing order. Count visits and stop when the kth value is reached.',
 'O(m) input parsing, then O(h+k) traversal time and O(h) traversal stack space; O(m) total storage.',
 ['Inorder traversal visits the left subtree, node, then right subtree.', 'You can stop immediately after visiting the kth node.'],
 _cm_tree_java+'''int k=f.i(),node=root;ArrayDeque<Integer>stack=new ArrayDeque<>();while(node!=-1||!stack.isEmpty()){while(node!=-1){stack.push(node);node=left[node];}node=stack.pop();if(--k==0){System.out.println(values[node]);break;}node=right[node];}''',
 _cm_tree_cpp+'''int k;cin>>k;int node=root;vector<int>stack;while(node!=-1||!stack.empty()){while(node!=-1){stack.push_back(node);node=left[node];}node=stack.back();stack.pop_back();if(--k==0){cout<<values[node];break;}node=right[node];}''',
 _cm_tree_python+'''k=ni();node=root;stack=[]
while node!=-1 or stack:
 while node!=-1:stack.append(node);node=left[node]
 node=stack.pop();k-=1
 if k==0:print(values[node]);break
 node=right[node]''',
 ['5\n3 1 4 null 2\n1\n','8\n5 3 6 2 4 null null 1\n3\n','1\n-7\n1\n','3\n2 1 3\n3\n','3\n0 -2147483648 2147483647\n2\n','5\n3 2 null 1 null\n2\n',_cm_array([str(x) if x%2==0 else 'null' for x in range(19999)])+'10000\n'], ['1','3'])

add('curated-add-two-numbers', 'Add Two Numbers', 'Linked lists', 'Medium',
 'Two linked lists store nonnegative decimal integers, one digit per node, with the least significant digit first. Add the integers and return the sum in the same digit order. The input adapter supplies list digits in head-to-tail order.',
 'n and m, followed by n digits of the first list, then m digits of the second list. The final digit of each input list is nonzero unless that list consists of the single digit 0.',
 'Print the number of digits in the sum, then its digits from least significant to most significant on the next line. Print zero as one digit 0.',
 ['1 <= n,m <= 2000', 'Each digit is between 0 and 9.'],
 'Build the two linked lists and walk their heads together. Add the current digits and carry, append sum modulo 10 to the result, and carry sum divided by 10. Continue while either list or a final carry remains.',
 'O(n+m) time, O(n+m) storage including adapted input lists and output.',
 ['Do not convert the entire lists to a fixed-width integer.', 'The result can have one more digit than either input.'],
 '''int n=f.i(),m=f.i();class Node{int digit;Node next;Node(int digit){this.digit=digit;}}Node first=new Node(0),second=new Node(0),tail=first;for(int i=0;i<n;i++){tail.next=new Node(f.i());tail=tail.next;}tail=second;for(int i=0;i<m;i++){tail.next=new Node(f.i());tail=tail.next;}Node a=first.next,b=second.next;int carry=0;List<Integer>out=new ArrayList<>();while(a!=null||b!=null||carry!=0){int sum=carry;if(a!=null){sum+=a.digit;a=a.next;}if(b!=null){sum+=b.digit;b=b.next;}out.add(sum%10);carry=sum/10;}System.out.println(out.size());for(int digit:out)System.out.print(digit+" ");''',
 '''int n,m;cin>>n>>m;struct Node{int digit=0;Node*next=nullptr;};vector<Node>first(n),second(m);for(int i=0;i<n;i++){cin>>first[i].digit;if(i+1<n)first[i].next=&first[i+1];}for(int i=0;i<m;i++){cin>>second[i].digit;if(i+1<m)second[i].next=&second[i+1];}Node*a=&first[0],*b=&second[0];int carry=0;vector<int>out;while(a||b||carry){int sum=carry;if(a){sum+=a->digit;a=a->next;}if(b){sum+=b->digit;b=b->next;}out.push_back(sum%10);carry=sum/10;}cout<<out.size()<<'\n';for(int digit:out)cout<<digit<<' ';'''.replace("'\n'", "'\\n'"),
 '''n=ni();m=ni()
class Node:
 def __init__(self,digit):self.digit=digit;self.next=None
def read_list(count):
 dummy=Node(0);tail=dummy
 for _ in range(count):tail.next=Node(ni());tail=tail.next
 return dummy.next
a=read_list(n);b=read_list(m);carry=0;out=[]
while a is not None or b is not None or carry:
 total=carry
 if a is not None:total+=a.digit;a=a.next
 if b is not None:total+=b.digit;b=b.next
 out.append(total%10);carry=total//10
print(len(out));print(*out)''',
 ['3 3\n2 4 3\n5 6 4\n','1 1\n0\n0\n','1 1\n9\n1\n','4 1\n9 9 9 9\n1\n','2 3\n1 2\n3 4 5\n','3 1\n0 0 1\n0\n','2000 1\n'+'9 '*2000+'\n1\n'], ['3\n7 0 8','1\n0'])
