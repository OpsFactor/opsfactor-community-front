package fixtures;
import com.fasterxml.jackson.annotation.*;
import com.fasterxml.jackson.databind.*;
import com.opsfactor.community.web.configuration.dataformat.*;
import java.io.*;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.LocalDate;
import java.util.*;
public final class BrowserDataFixtures {
 public enum State { @JsonProperty("approved-state") APPROVED }
 public static class Key { public String material; public String location; }
 public static class Child { public String name; public BigDecimal amount; public Child(){} public Child(String n,String a){name=n;amount=new BigDecimal(a);} }
 public static class Row { @JsonUnwrapped public Key key; @JsonProperty("output_quantity") public BigDecimal quantity; public Child child; public List<Child> alternatives; public Map<String,Child> factories; public LocalDate date; public State state; public Boolean enabled; public Long nullable; @JsonIgnore public String internal="do-not-export"; }
 public static class Flat { public String id; public Long count; public Long unsafeLong; public Double amount; public String nullable; public Boolean enabled; public LocalDate date; }
 public static class Envelope<T> { public List<T> data; public Map<String,Object> options; public Map<String,Object> dataFilter; public String threadSync; }
 public static void main(String[] args)throws Exception{
  Path output=Path.of(args[0]); Files.createDirectories(output);
  ObjectMapper mapper=new ObjectMapper().findAndRegisterModules().disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
  DataFormatCodec codec=new DataFormatCodec(mapper);
  Row row=new Row(); row.key=new Key(); row.key.material="MAT-A";row.key.location="PLANT-A";
  row.quantity=new BigDecimal("12345678901234567890.12345678901234567");row.child=new Child("Bobina São Paulo 日本","5.25");
  row.alternatives=Arrays.asList(new Child("A","3.912"),null,new Child("B","-0.002"));
  row.factories=new LinkedHashMap<>();row.factories.put("A",new Child("MP A","5.25"));row.factories.put("B",null);
  row.date=LocalDate.of(2026,10,22);row.state=State.APPROVED;row.enabled=true;
  Row row2=new Row();row2.key=new Key();row2.key.material="MAT-B";row2.key.location="PLANT-B";row2.quantity=new BigDecimal("0.0001");row2.alternatives=List.of();row2.factories=Map.of();row2.enabled=false;
  JavaType rows=mapper.getTypeFactory().constructCollectionType(List.class,Row.class);
  write(codec,output,"nested",List.of(row,row2),rows);
  write(codec,output,"empty",List.of(),rows);
  write(codec,output,"single",row,mapper.constructType(Row.class));
  Envelope<Row> env=new Envelope<>();env.data=List.of(row);env.options=Map.of("replace",true,"threshold",new BigDecimal("12345678901234567890.12345678901234567"));env.dataFilter=Map.of("location","PLANT-A");env.threadSync="SYNC";
  write(codec,output,"envelope",env,mapper.getTypeFactory().constructParametricType(Envelope.class,Row.class));
  Flat flat=new Flat();flat.id="00123";flat.count=42L;flat.unsafeLong=Long.MAX_VALUE;flat.amount=3.912;flat.enabled=false;flat.date=LocalDate.of(2026,10,22);
  write(codec,output,"flat",List.of(flat),mapper.getTypeFactory().constructCollectionType(List.class,Flat.class));
  JavaType matrix=mapper.getTypeFactory().constructCollectionType(List.class,mapper.getTypeFactory().constructCollectionType(List.class,Object.class));
  write(codec,output,"matrix",List.of(List.of("Material","Quantidade","Ativo"),List.of("00123",new BigDecimal("3.912"),true)),matrix);
 }
 private static void write(DataFormatCodec codec,Path dir,String name,Object value,JavaType type)throws Exception{
  for(DataFormat format:List.of(DataFormat.JSON,DataFormat.ARROW,DataFormat.PARQUET))try(OutputStream out=Files.newOutputStream(dir.resolve(name+"."+format.extension()))){codec.write(value,type,format,out,Map.of());}
 }
}
