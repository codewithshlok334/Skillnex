package com.careerx;

import static org.junit.jupiter.api.Assertions.*;

import com.careerx.codelab.OutputChecker;
import org.junit.jupiter.api.Test;

class OutputCheckerTest {
 @Test void tokenComparisonIgnoresOnlyWhitespace(){
  assertTrue(OutputChecker.accepts("TOKENS","","1 2\n3"," 1\n2  3 \n"));
  assertTrue(OutputChecker.accepts("TOKENS","",""," \n\t"));
  assertFalse(OutputChecker.accepts("TOKENS","","1 2","2 1"));
  assertFalse(OutputChecker.accepts("TOKENS","","1 2","1 2 2"));
  assertFalse(OutputChecker.accepts("TOKENS","","1 2","1"));
 }

 @Test void pairIndicesAcceptAnyDistinctValidPositionsInEitherOrder(){
  String input="4 10\n3 7 2 8";
  assertTrue(OutputChecker.accepts("PAIR_INDICES",input,"0 1","2 3"));
  assertTrue(OutputChecker.accepts("PAIR_INDICES",input,"0 1","3 2"));
  assertTrue(OutputChecker.accepts("PAIR_INDICES","2 6\n3 3","0 1","1 0"));
  assertTrue(OutputChecker.accepts("PAIR_INDICES","2 2000000000\n1000000000 1000000000","0 1","1 0"));
  for(String invalid:new String[]{"0 0","-1","4 1","-1 1","0 2","0 1 2","a b"})
   assertFalse(OutputChecker.accepts("PAIR_INDICES",input,"0 1",invalid),invalid);
  assertTrue(OutputChecker.accepts("PAIR_INDICES","2 99\n1 2","-1"," -1\n"));
  assertFalse(OutputChecker.accepts("PAIR_INDICES","2 99\n1 2","-1","0 1"));
 }

 @Test void tokenMultisetAllowsReorderingWithoutDiscardingMultiplicity(){
  assertTrue(OutputChecker.accepts("TOKEN_MULTISET","","4 9 4","9\n4 4"));
  assertTrue(OutputChecker.accepts("TOKEN_MULTISET","",""," \n"));
  assertFalse(OutputChecker.accepts("TOKEN_MULTISET","","4 9 4","9 4"));
  assertFalse(OutputChecker.accepts("TOKEN_MULTISET","","4 9 4","9 9 4"));
  assertFalse(OutputChecker.accepts("TOKEN_MULTISET","","4 9","9 4 4"));
 }

 @Test void unorderedLinesAllowRowOrderButPreserveOrderWithinEachRow(){
  String expected="2\n-1 0 1\n-1 -1 2\n";
  assertTrue(OutputChecker.accepts("UNORDERED_LINES","",expected," 2\n -1  -1 2\r\n-1 0 1 \n"));
  assertTrue(OutputChecker.accepts("UNORDERED_LINES","","0\n"," 0\n"));
  assertFalse(OutputChecker.accepts("UNORDERED_LINES","",expected,"2\n1 0 -1\n-1 -1 2"));
  assertFalse(OutputChecker.accepts("UNORDERED_LINES","",expected,"2\n-1 0 1\n-1 0 1"));
  assertFalse(OutputChecker.accepts("UNORDERED_LINES","",expected,"1\n-1 0 1"));
  assertFalse(OutputChecker.accepts("UNORDERED_LINES","",expected,"2\n-1 0 1"));
  assertFalse(OutputChecker.accepts("UNORDERED_LINES","",expected,"3\n-1 0 1\n-1 -1 2"));
  assertFalse(OutputChecker.accepts("UNORDERED_LINES","",expected,"-1"));
  assertFalse(OutputChecker.accepts("UNORDERED_LINES","",expected,"two\n-1 0 1\n-1 -1 2"));
 }

 @Test void unorderedGroupsAllowGroupAndMemberOrderWithExplicitSizes(){
  String expected="3\n3 eat tea ate\n2 tan nat\n1 bat\n";
  assertTrue(OutputChecker.accepts("UNORDERED_GROUPS","",expected,"3\n1 bat\n3 ate eat tea\n2 nat tan\n"));
  assertTrue(OutputChecker.accepts("UNORDERED_GROUPS","","0\n","0"));
  assertTrue(OutputChecker.accepts("UNORDERED_GROUPS","","2\n0\n1 a","2\n1 a\n0"));
  assertFalse(OutputChecker.accepts("UNORDERED_GROUPS","",expected,"3\n3 eat tea tea\n2 tan nat\n1 bat"));
  assertFalse(OutputChecker.accepts("UNORDERED_GROUPS","",expected,"3\n3 eat tea ate\n2 tan nat\n1 nat"));
  assertFalse(OutputChecker.accepts("UNORDERED_GROUPS","",expected,"3\n2 eat tea\n2 tan nat\n1 bat"));
  assertFalse(OutputChecker.accepts("UNORDERED_GROUPS","",expected,"3\n4 eat tea ate\n2 tan nat\n1 bat"));
  assertFalse(OutputChecker.accepts("UNORDERED_GROUPS","",expected,"2\n3 eat tea ate\n2 tan nat\n1 bat"));
  assertFalse(OutputChecker.accepts("UNORDERED_GROUPS","",expected,"3\n3 eat tea ate\n2 tan nat"));
  assertFalse(OutputChecker.accepts("UNORDERED_GROUPS","",expected,"3\nthree eat tea ate\n2 tan nat\n1 bat"));
  assertFalse(OutputChecker.accepts("UNORDERED_GROUPS","","2\n1 a\n1 b","2\n1 a\n1 a"));
 }

 @Test void everyCheckerRejectsAbsentOrOversizedOutput(){
  for(String checker:new String[]{"TOKENS","PAIR_INDICES","TOKEN_MULTISET","UNORDERED_LINES","UNORDERED_GROUPS"}){
   assertFalse(OutputChecker.accepts(checker,"2 3\n1 2","0 1",null));
   assertFalse(OutputChecker.accepts(checker,"2 3\n1 2","0 1"," ".repeat(65537)));
  }
 }
}
